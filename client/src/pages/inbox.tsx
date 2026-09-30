import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Check,
  Trash2,
  AtSign,
  Clock3,
  UserPlus,
  MessageSquare,
  CheckSquare,
} from 'lucide-react';
import { useAction } from '../hooks/use-data';
import { api, json } from '../services/api';
import { PageHeading, Loading, ErrorState, Empty, Pagination } from '../components/common';
import { Button } from '../components/ui/button';
import { relative } from '../lib/utils';
import type { Page, Notification } from '../types';
const icons: Record<string, typeof Bell> = {
  TASK_MENTION: AtSign,
  DEADLINE: Clock3,
  WORKSPACE_INVITATION: UserPlus,
  PROJECT_INVITATION: UserPlus,
  COMMENT: MessageSquare,
  TASK_ASSIGNED: CheckSquare,
};
export default function Inbox() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['notifications', page],
    queryFn: () =>
      api<Page<Notification> & { unread: number }>(`/notifications?page=${page}&limit=20`),
  });
  const read = useAction((id: string) => api(`/notifications/${id}/read`, json('PATCH')));
  const all = useAction(
    () => api('/notifications/read-all', json('PATCH')),
    'You’re all caught up',
  );
  const remove = useAction((id: string) => api(`/notifications/${id}`, json('DELETE')));
  return (
    <>
      <PageHeading
        eyebrow="STAY IN THE LOOP"
        title="Your inbox"
        description="Updates, conversations, and the little things that keep work moving."
        actions={
          <Button
            variant="outline"
            disabled={all.isPending || !query.data?.unread}
            onClick={() => all.mutate()}
          >
            <CheckCheck size={16} /> Mark all as read
          </Button>
        }
      />
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : query.data.items.length ? (
        <section className="panel">
          <div className="notification-list">
            {query.data.items.map((n) => {
              const Icon = icons[n.type] ?? Bell;
              return (
                <article key={n.id} className={!n.readAt ? 'unread' : ''}>
                  <span className="notification-icon">
                    <Icon size={19} />
                  </span>
                  <Link
                    to={n.href}
                    onClick={() => {
                      if (!n.readAt) read.mutate(n.id);
                    }}
                  >
                    <strong>{n.title}</strong>
                    <p>{n.body}</p>
                    <small>{relative(n.createdAt)}</small>
                  </Link>
                  {!n.readAt && (
                    <button
                      className="icon-button"
                      disabled={read.isPending}
                      aria-label={`Mark ${n.title} as read`}
                      onClick={() => read.mutate(n.id)}
                    >
                      <Check size={17} />
                    </button>
                  )}
                  <button
                    className="icon-button"
                    disabled={remove.isPending}
                    aria-label={`Delete ${n.title}`}
                    onClick={() => remove.mutate(n.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </article>
              );
            })}
          </div>
          <Pagination {...query.data} onChange={setPage} />
        </section>
      ) : (
        <Empty
          icon={<Bell size={28} />}
          title="A quiet moment"
          description="You’re all caught up. New updates will find you here."
        />
      )}
    </>
  );
}
