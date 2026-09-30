import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, LayoutGrid, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../hooks/use-data';
import { api } from '../services/api';
import { Button } from '../components/ui/button';
import {
  PageHeading,
  Loading,
  ErrorState,
  Empty,
  Pagination,
  Badge,
  Progress,
} from '../components/common';
import { ProjectDialog } from '../components/forms';
import { ProjectCard } from '../features/projects';
import type { Project, Page } from '../types';
export default function Projects() {
  const { workspace, canManage } = useWorkspace();
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [workspace?.id]);
  const [create, setCreate] = useState(false);
  const [filter, setFilter] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const query = useQuery({
    queryKey: ['projects', workspace?.id, page],
    queryFn: () =>
      api<Page<Project>>(`/projects?workspaceId=${workspace!.id}&page=${page}&limit=12`),
    enabled: !!workspace,
  });
  const projects = query.data?.items.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="IDEAS INTO ACTION"
        title="Your projects"
        description="A home for every idea. A clear path to what’s next."
        actions={
          canManage && (
            <Button onClick={() => setCreate(true)}>
              <Plus size={16} /> New project
            </Button>
          )
        }
      />
      <div className="toolbar">
        <div className="input-with-icon">
          <Search size={17} />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter this page…"
            aria-label="Filter projects"
          />
        </div>
        <div className="view-toggle">
          <button
            aria-label="Grid view"
            aria-pressed={view === 'grid'}
            onClick={() => setView('grid')}
            className={view === 'grid' ? 'selected' : ''}
          >
            <LayoutGrid size={17} />
          </button>
          <button
            aria-label="List view"
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
            className={view === 'list' ? 'selected' : ''}
          >
            <List size={17} />
          </button>
        </div>
      </div>
      {!workspace ? (
        <Empty
          title="Your projects need a workspace"
          description="Create one from the overview to get started."
          action={
            <Button asChild>
              <Link to="/app">Go to overview</Link>
            </Button>
          }
        />
      ) : query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : projects?.length ? (
        view === 'grid' ? (
          <div className="project-grid all-projects">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        ) : (
          <div className="panel project-list">
            {projects.map((p) => (
              <Link to={`/app/projects/${p.id}`} key={p.id}>
                <span className="project-dot" style={{ background: p.color }} />
                <strong>{p.name}</strong>
                <Badge value={p.status} />
                <Progress
                  value={p._count.tasks ? Math.round((p.completedTasks / p._count.tasks) * 100) : 0}
                />
                <span>
                  {p.completedTasks}/{p._count.tasks}
                </span>
              </Link>
            ))}
          </div>
        )
      ) : (
        <Empty
          title={filter ? 'No projects match' : 'Your next big thing starts here'}
          description={
            filter
              ? 'Try a different project name.'
              : 'Create a project and give your ideas some room to grow.'
          }
          action={
            !filter && canManage && <Button onClick={() => setCreate(true)}>Create project</Button>
          }
        />
      )}
      {query.data && <Pagination {...query.data} onChange={setPage} />}
      <ProjectDialog open={create} onClose={() => setCreate(false)} />
    </>
  );
}
