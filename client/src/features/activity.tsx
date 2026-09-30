import { Avatar } from '../components/common';
import { relative } from '../lib/utils';
import type { Activity } from '../types';
import { Link } from 'react-router-dom';
export function ActivityFeed({ items }: { items: Activity[] }) {
  return (
    <div className="activity-feed">
      {items.map((a) => (
        <div className="activity-item" key={a.id}>
          <Avatar user={a.actor} size="small" />
          <div>
            <p>
              <strong>{a.actor.name}</strong> {a.action}
            </p>
            {a.projectId ? (
              <Link
                to={`/app/projects/${a.projectId}${a.entity === 'task' ? `?task=${a.entityId}` : ''}`}
              >
                {a.metadata?.title ?? a.entity}
              </Link>
            ) : (
              <span>{a.metadata?.title ?? a.entity}</span>
            )}
            <small>{relative(a.createdAt)}</small>
          </div>
        </div>
      ))}
    </div>
  );
}
