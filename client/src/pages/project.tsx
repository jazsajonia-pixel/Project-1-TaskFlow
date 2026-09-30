import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Plus, Search, LayoutGrid, List, ArrowLeft, Radio, X } from 'lucide-react';
import { io } from 'socket.io-client';
import { api, qs } from '../services/api';
import { useWorkspace, useDebounce } from '../hooks/use-data';
import { useUI } from '../stores/ui';
import { Button } from '../components/ui/button';
import { PageHeading, Loading, ErrorState, Badge, Avatars, Empty } from '../components/common';
import { TaskDialog } from '../features/task-editor';
import { Kanban } from '../features/kanban';
import { TaskList } from '../features/task-list';
import {
  ProjectOverview,
  ProjectActivity,
  ProjectFiles,
  ProjectMembers,
  ProjectSettings,
} from '../features/project-panels';
import { priorities, pretty } from '../lib/utils';
import type { Project, Page, Task, TaskStatus, Person } from '../types';
const tabs = ['Overview', 'Board', 'Tasks', 'Members', 'Files', 'Activity', 'Settings'];
export default function ProjectPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get('view') ?? 'Board';
  const taskId = params.get('task') ?? undefined;
  const [create, setCreate] = useState<TaskStatus>();
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [mine, setMine] = useState(false);
  const q = useDebounce(search);
  const { canWrite } = useWorkspace();
  const [online, setOnline] = useState<Person[]>([]);
  const project = useQuery({
    queryKey: ['project', id],
    queryFn: () => api<Project>(`/projects/${id}`),
    enabled: !!id,
  });
  useEffect(() => {
    if (project.data) useUI.getState().setWorkspace(project.data.workspaceId);
  }, [project.data?.workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!id) return;
    const socket = io({ withCredentials: true });
    const poll = () => socket.emit('presence', id, (users: Person[]) => setOnline(users));
    socket.on('connect', () => socket.emit('join', { projectId: id }, poll));
    socket.on('presence:changed', poll);
    const timer = setInterval(poll, 15000);
    return () => {
      clearInterval(timer);
      socket.disconnect();
    };
  }, [id]);
  const tasks = useInfiniteQuery({
    queryKey: ['tasks', id, q, priority, mine],
    queryFn: ({ pageParam }) =>
      api<Page<Task>>(
        `/projects/${id}/tasks?${qs({ page: pageParam, limit: 100, q, priority, assigned: mine ? 'true' : undefined })}`,
      ),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
    enabled: !!project.data && ['Board', 'Tasks'].includes(tab),
  });
  const items = tasks.data?.pages.flatMap((p) => p.items) ?? [];
  const openTask = (task: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('task', task);
      return next;
    });
  const closeTask = () => {
    setCreate(undefined);
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete('task');
      return next;
    });
  };
  if (project.isPending) return <Loading />;
  if (project.error)
    return <ErrorState error={project.error} retry={() => void project.refetch()} />;
  const p = project.data;
  return (
    <>
      <Link to="/app/projects" className="back-link project-back">
        <ArrowLeft size={14} /> All projects
      </Link>
      <PageHeading
        title={p.name}
        description={p.description ?? 'A shared space to do your best work.'}
        actions={
          <>
            <Badge value={p.status} />
            <Avatars people={p.members.map((m) => m.user)} />
            {canWrite && (
              <Button onClick={() => setCreate('TODO')}>
                <Plus size={16} /> New task
              </Button>
            )}
          </>
        }
      />
      <nav className="project-tabs" aria-label="Project views">
        {tabs.map((t) => (
          <button
            key={t}
            className={tab === t ? 'active' : ''}
            aria-current={tab === t ? 'page' : undefined}
            onClick={() => setParams({ view: t })}
          >
            {t}
          </button>
        ))}
        <span className="live-indicator" title={online.map((p) => p.name).join(', ')}>
          <Radio size={13} />
          {online.length} online
        </span>
      </nav>
      {['Board', 'Tasks'].includes(tab) && (
        <>
          <div className="toolbar">
            <div className="board-filters">
              <div className="input-with-icon">
                <Search size={16} />
                <input
                  placeholder="Find a task…"
                  aria-label="Filter tasks"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                aria-label="Filter by priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="">All priorities</option>
                {priorities.map((v) => (
                  <option key={v} value={v}>
                    {pretty(v)}
                  </option>
                ))}
              </select>
              <button
                className={`filter-chip ${mine ? 'active' : ''}`}
                onClick={() => setMine(!mine)}
                aria-pressed={mine}
              >
                Assigned to me{mine && <X size={12} />}
              </button>
            </div>
            <div className="view-toggle">
              <button
                className={tab === 'Board' ? 'selected' : ''}
                aria-label="Board view"
                onClick={() => setParams({ view: 'Board' })}
              >
                <LayoutGrid size={17} />
              </button>
              <button
                className={tab === 'Tasks' ? 'selected' : ''}
                aria-label="Table view"
                onClick={() => setParams({ view: 'Tasks' })}
              >
                <List size={17} />
              </button>
            </div>
          </div>
          {tasks.isPending ? (
            <Loading />
          ) : tasks.error ? (
            <ErrorState error={tasks.error} retry={() => void tasks.refetch()} />
          ) : tab === 'Board' ? (
            <Kanban tasks={items} canWrite={canWrite} onOpen={openTask} onCreate={setCreate} />
          ) : items.length ? (
            <div className="panel">
              <TaskList tasks={items} onOpen={(task) => openTask(task.id)} />
            </div>
          ) : (
            <Empty
              title="A clean slate"
              description="Create a task or try changing your filters."
            />
          )}
          {tasks.hasNextPage && (
            <div className="load-more">
              <Button
                variant="outline"
                disabled={tasks.isFetchingNextPage}
                onClick={() => void tasks.fetchNextPage()}
              >
                Load more tasks ({items.length} of {tasks.data?.pages[0].total})
              </Button>
            </div>
          )}
        </>
      )}
      {tab === 'Overview' && <ProjectOverview project={p} />}
      {tab === 'Members' && <ProjectMembers project={p} />}
      {tab === 'Files' && <ProjectFiles projectId={p.id} />}
      {tab === 'Activity' && <ProjectActivity projectId={p.id} />}
      {tab === 'Settings' && <ProjectSettings key={p.id} project={p} />}
      {(!!taskId || !!create) && (
        <TaskDialog project={p} taskId={taskId} defaultStatus={create} open onClose={closeTask} />
      )}
    </>
  );
}
