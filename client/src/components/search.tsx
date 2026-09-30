import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Folder, CheckSquare, Users, Building2 } from 'lucide-react';
import { Dialog } from './ui/dialog';
import { useDebounce } from '../hooks/use-data';
import { api } from '../services/api';
import { useUI } from '../stores/ui';
import { Empty, ErrorState, Loading, Avatar } from './common';
import type { Person } from '../types';
interface Results {
  projects: { id: string; name: string; workspaceId: string }[];
  tasks: { id: string; title: string; projectId: string }[];
  workspaces: { id: string; name: string }[];
  users: Person[];
}
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [value, setValue] = useState('');
  const q = useDebounce(value);
  const result = useQuery({
    queryKey: ['search', q],
    queryFn: () => api<Results>(`/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2,
  });
  const data = result.data;
  return (
    <Dialog open={open} onOpenChange={onClose} title="Find your flow">
      <div className="search-input">
        <Search size={19} />
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search projects, tasks, people…"
          aria-label="Search everything"
          maxLength={100}
        />
        <kbd>esc</kbd>
      </div>
      {q.length < 2 ? (
        <Empty
          title="Everything, a little closer"
          description="Type at least two characters to search your workspaces."
        />
      ) : result.isLoading ? (
        <Loading compact />
      ) : result.error ? (
        <ErrorState error={result.error} />
      ) : (
        data && (
          <div className="search-results">
            {data.projects.length > 0 && (
              <section>
                <h4>Projects</h4>
                {data.projects.map((p) => (
                  <Link key={p.id} to={`/app/projects/${p.id}`} onClick={onClose}>
                    <Folder size={17} />
                    {p.name}
                  </Link>
                ))}
              </section>
            )}
            {data.tasks.length > 0 && (
              <section>
                <h4>Tasks</h4>
                {data.tasks.map((t) => (
                  <Link
                    key={t.id}
                    to={`/app/projects/${t.projectId}?task=${t.id}`}
                    onClick={onClose}
                  >
                    <CheckSquare size={17} />
                    {t.title}
                  </Link>
                ))}
              </section>
            )}
            {data.workspaces.length > 0 && (
              <section>
                <h4>Workspaces</h4>
                {data.workspaces.map((w) => (
                  <Link
                    key={w.id}
                    to="/app"
                    onClick={() => {
                      useUI.getState().setWorkspace(w.id);
                      onClose();
                    }}
                  >
                    <Building2 size={17} />
                    {w.name}
                  </Link>
                ))}
              </section>
            )}
            {data.users.length > 0 && (
              <section>
                <h4>
                  <Users size={14} /> People
                </h4>
                {data.users.map((u) => (
                  <div className="search-person" key={u.id}>
                    <Avatar user={u} size="small" />
                    {u.name}
                  </div>
                ))}
              </section>
            )}
            {Object.values(data).every((items) => items.length === 0) && (
              <Empty
                title="No matches yet"
                description="Try a different name or a shorter search."
              />
            )}
          </div>
        )
      )}
    </Dialog>
  );
}
