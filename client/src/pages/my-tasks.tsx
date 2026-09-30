import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, CheckCheck } from 'lucide-react';
import { api, qs } from '../services/api';
import { useDebounce } from '../hooks/use-data';
import { TaskList } from '../features/task-list';
import { PageHeading, Loading, ErrorState, Empty, Pagination } from '../components/common';
import { statuses, pretty, priorities } from '../lib/utils';
import type { Page, Task } from '../types';
export default function MyTasks() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const q = useDebounce(search);
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['my-tasks', page, q, status, priority],
    queryFn: () => api<Page<Task>>(`/tasks?${qs({ page, limit: 20, q, status, priority })}`),
  });
  return (
    <>
      <PageHeading
        eyebrow="YOUR NEXT SMALL WINS"
        title="My tasks"
        description="A little focus goes a long way. Here’s what’s on your plate."
      />
      <div className="toolbar">
        <div className="board-filters">
          <div className="input-with-icon">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Find a task…"
              aria-label="Filter tasks"
            />
          </div>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {pretty(s)}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by priority"
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All priorities</option>
            {priorities.map((p) => (
              <option key={p} value={p}>
                {pretty(p)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : query.data.items.length ? (
        <div className="panel">
          <TaskList
            tasks={query.data.items}
            onOpen={(t) => navigate(`/app/projects/${t.projectId}?task=${t.id}`)}
          />
          <Pagination {...query.data} onChange={setPage} />
        </div>
      ) : (
        <Empty
          icon={<CheckCheck size={30} />}
          title="A little breathing room"
          description="Tasks assigned to you will appear here. Try clearing filters if you expected more."
        />
      )}
    </>
  );
}
