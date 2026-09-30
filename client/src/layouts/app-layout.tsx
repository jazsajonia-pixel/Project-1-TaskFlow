import { useEffect, useState, useRef } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Bell,
  Users,
  Settings,
  Search,
  Plus,
  ChevronDown,
  ArrowUpRight,
  Moon,
  Sun,
  Menu,
  X,
  LogOut,
  Activity,
  CircleHelp,
} from 'lucide-react';
import { useUser, useWorkspace, useLogout } from '../hooks/use-data';
import { useUI } from '../stores/ui';
import { api } from '../services/api';
import { Logo, Avatar, Loading, ErrorState } from '../components/common';
import { WorkspaceDialog } from '../components/forms';
import { SearchDialog } from '../components/search';
import type { Notification, Page, Project } from '../types';
const navigation = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/projects', label: 'Projects', icon: FolderKanban },
  { to: '/app/my-tasks', label: 'My tasks', icon: CheckSquare },
  { to: '/app/inbox', label: 'Inbox', icon: Bell },
];
export default function AppLayout() {
  const user = useUser();
  const sidebarRef = useRef<HTMLElement>(null);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const { workspace, data: workspaces } = useWorkspace();
  const [create, setCreate] = useState(false);
  const [search, setSearch] = useState(false);
  const ui = useUI();
  const logout = useLogout();
  useEffect(() => {
    if (!mobile || !ui.sidebarOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    sidebarRef.current
      ?.querySelector<HTMLButtonElement>('button[aria-label="Close navigation"]')
      ?.focus();
    return () => {
      requestAnimationFrame(() => previous?.focus());
    };
  }, [mobile, ui.sidebarOpen]);
  const client = useQueryClient();
  const location = useLocation();
  const projectId = location.pathname.match(/^\/app\/projects\/([^/]+)/)?.[1];
  const notifications = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: () => api<Page<Notification> & { unread: number }>('/notifications?limit=1'),
    enabled: !!user.data,
  });
  const projects = useQuery({
    queryKey: ['projects', 'sidebar', workspace?.id],
    queryFn: () => api<Page<Project>>(`/projects?workspaceId=${workspace!.id}&limit=5`),
    enabled: !!workspace,
  });
  useEffect(() => {
    ui.setSidebar(false);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handler = () => {
      client.setQueryData(['user'], null);
    };
    window.addEventListener('session-expired', handler);
    return () => window.removeEventListener('session-expired', handler);
  }, [client]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => {
    if (!user.data) return;
    const socket = io({ withCredentials: true });
    socket.on('connect', () => {
      socket.emit('join', { workspaceId: workspace?.id, projectId });
    });
    const invalidate = () => {
      void client.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'user' });
    };
    socket.on('data:changed', invalidate);
    socket.on('notification', invalidate);
    socket.on('access:changed', invalidate);
    return () => {
      socket.disconnect();
    };
  }, [user.data?.id, workspace?.id, projectId, client]); // eslint-disable-line react-hooks/exhaustive-deps
  if (user.isPending) return <Loading />;
  if (user.error && !('status' in user.error && user.error.status === 401))
    return <ErrorState error={user.error} retry={() => void user.refetch()} />;
  if (!user.data)
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  const activeLabel = location.pathname.includes('/projects/')
    ? 'Project workspace'
    : ([
        ...navigation,
        { to: '/app/team', label: 'Team members' },
        { to: '/app/activity', label: 'Activity' },
        { to: '/app/settings', label: 'Workspace settings' },
        { to: '/app/profile', label: 'My profile' },
      ].find((n) => n.to === location.pathname)?.label ?? 'Workspace');
  return (
    <div className="app-shell">
      {ui.sidebarOpen && (
        <button
          className="sidebar-backdrop"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => ui.setSidebar(false)}
          aria-label="Close navigation"
        />
      )}
      <aside
        ref={sidebarRef}
        className={`sidebar ${ui.sidebarOpen ? 'sidebar-open' : ''}`}
        inert={mobile && !ui.sidebarOpen}
        role={mobile ? 'dialog' : undefined}
        aria-modal={mobile && ui.sidebarOpen ? true : undefined}
        aria-label="Workspace navigation"
        onKeyDown={(event) => {
          if (!mobile) return;
          if (event.key === 'Escape') ui.setSidebar(false);
          if (event.key !== 'Tab') return;
          const elements = [
            ...(sidebarRef.current?.querySelectorAll<HTMLElement>(
              'a, button, input, select, [tabindex="0"]',
            ) ?? []),
          ].filter((element) => element.offsetParent !== null && !element.hasAttribute('disabled'));
          const first = elements[0],
            last = elements[elements.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className="sidebar-brand">
          <Logo />
          <button
            className="icon-button mobile-only"
            onClick={() => ui.setSidebar(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-selector">
          <div className="workspace-icon">{workspace?.name.slice(0, 1) ?? 'W'}</div>
          <div>
            <small>WORKSPACE</small>
            <select
              aria-label="Select workspace"
              value={workspace?.id ?? ''}
              onChange={(e) => ui.setWorkspace(e.target.value)}
            >
              {!workspace && <option value="">Your workspace</option>}
              {workspaces?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <ChevronDown size={15} />
        </div>
        <button className="sidebar-search" onClick={() => setSearch(true)}>
          <Search size={16} /> Quick search <kbd>⌘ K</kbd>
        </button>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <n.icon size={18} />
              {n.label}
              {n.label === 'Inbox' && !!notifications.data?.unread && (
                <span className="nav-count">{notifications.data.unread}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="nav-divider" />
        <nav aria-label="Team navigation">
          <NavLink to="/app/team" className="nav-item">
            <Users size={18} /> Team members
          </NavLink>
          <NavLink to="/app/activity" className="nav-item">
            <Activity size={18} /> Activity
          </NavLink>
          <NavLink to="/app/settings" className="nav-item">
            <Settings size={18} /> Settings
          </NavLink>
        </nav>
        <div className="nav-caption project-caption">
          YOUR PROJECTS
          <NavLink to="/app/projects" aria-label="View all projects">
            <Plus size={15} />
          </NavLink>
        </div>
        <div className="sidebar-projects">
          {projects.data?.items.map((p) => (
            <NavLink to={`/app/projects/${p.id}`} key={p.id} className="nav-item">
              <span className="project-dot" style={{ background: p.color }} />
              {p.name}
            </NavLink>
          ))}
          {!projects.data?.items.length && (
            <p className="muted sidebar-hint">Your next big idea starts here.</p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="workspace-prompt">
            <span className="sparkle">✦</span>
            <strong>Space for your next big idea.</strong>
            <p>A fresh workspace. Endless possibilities.</p>
            <button onClick={() => setCreate(true)}>
              Create a workspace <ArrowUpRight size={15} />
            </button>
          </div>
          <a href="/api/docs" target="_blank" rel="noreferrer" className="nav-item">
            <CircleHelp size={17} /> Help & documentation <ArrowUpRight size={14} />
          </a>
          <div className="user-card">
            <NavLink to="/app/profile">
              <Avatar user={user.data} />
              <span>
                <strong>{user.data.name}</strong>
                <small>Personal account</small>
              </span>
            </NavLink>
            <button
              className="icon-button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="app-main" inert={mobile && ui.sidebarOpen}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              onClick={() => ui.setSidebar(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <span>{workspace?.name ?? 'Your workspace'}</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{activeLabel}</strong>
          </div>
          <div className="topbar-actions">
            <span className="today-label">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <button
              className="icon-button"
              onClick={ui.toggleTheme}
              aria-label={`Switch to ${ui.theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {ui.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <NavLink
              to="/app/inbox"
              className="icon-button notification-button"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {!!notifications.data?.unread && <i />}
            </NavLink>
            <span className="topbar-divider" />
            <NavLink to="/app/profile">
              <Avatar user={user.data} size="small" />
            </NavLink>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>Make a little progress, every day.</span>
          <span>
            Made for focused teams <span className="purple">✦</span>
          </span>
        </footer>
      </div>
      <WorkspaceDialog open={create} onClose={() => setCreate(false)} />
      <SearchDialog open={search} onClose={() => setSearch(false)} />
    </div>
  );
}
