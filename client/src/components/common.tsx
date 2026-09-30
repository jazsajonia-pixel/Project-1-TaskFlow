import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  CircleAlert,
  FolderOpen,
  LoaderCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactNode,
  type ReactElement,
} from 'react';
import { initials, pretty } from '../lib/utils';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import type { Person } from '../types';
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="logo" to="/" aria-label="TaskFlow home">
      <span className="logo-mark">
        <ChevronsRight size={25} strokeWidth={2.6} />
      </span>
      {!compact && (
        <span>
          taskflow<span className="logo-dot">.</span>
        </span>
      )}
    </Link>
  );
}
export function Avatar({
  user,
  size = 'normal',
}: {
  user: Person;
  size?: 'small' | 'normal' | 'large';
}) {
  return (
    <span className={`avatar avatar-${size}`} title={user.name}>
      {user.avatar ? (
        <img
          loading="lazy"
          decoding="async"
          src={user.avatar}
          alt={user.name}
          referrerPolicy="no-referrer"
        />
      ) : (
        initials(user.name)
      )}
    </span>
  );
}
export function Avatars({ people }: { people: Person[] }) {
  return (
    <div className="avatar-stack">
      {people.slice(0, 4).map((user) => (
        <Avatar key={user.id} user={user} size="small" />
      ))}
      {people.length > 4 && <span className="avatar avatar-small">+{people.length - 4}</span>}
    </div>
  );
}
export function Badge({ value, children }: { value: string; children?: ReactNode }) {
  return <span className={`badge badge-${value.toLowerCase()}`}>{children ?? pretty(value)}</span>;
}
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="heading-actions">{actions}</div>
    </header>
  );
}
export function Empty({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon ?? <FolderOpen size={28} />}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Loading({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={compact ? 'loading-compact' : 'loading-grid'}
      role="status"
      aria-label="Loading"
    >
      {compact ? (
        <LoaderCircle className="spin" />
      ) : (
        Array.from({ length: 6 }, (_, i) => <div className="skeleton" key={i} />)
      )}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
export function ErrorState({ error, retry }: { error: Error | null; retry?: () => void }) {
  return (
    <Empty
      icon={<CircleAlert size={28} />}
      title="We couldn’t load this"
      description={error?.message ?? 'Please try again.'}
      action={
        retry && (
          <Button variant="outline" onClick={retry}>
            Try again
          </Button>
        )
      }
    />
  );
}
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  const id = useId();
  const controlProps = {
    id,
    'aria-describedby': error ? `${id}-error` : undefined,
    'aria-invalid': error ? true : undefined,
  };
  let linked = false;
  const decorate = (node: ReactNode): ReactNode =>
    Children.map(node, (child) => {
      if (!isValidElement(child)) return child;
      const element = child as ReactElement<Record<string, unknown>>;
      if (
        ['input', 'select', 'textarea'].includes(String(element.type)) &&
        element.props.type !== 'checkbox' &&
        !linked
      ) {
        linked = true;
        return cloneElement(element, controlProps);
      }
      if (element.type === 'span')
        return cloneElement(element, {}, decorate(element.props.children as ReactNode));
      return child;
    });
  const content = decorate(children);
  return (
    <div className="field">
      {linked ? <label htmlFor={id}>{label}</label> : <span id={`${id}-label`}>{label}</span>}
      {linked ? (
        content
      ) : (
        <div role="group" aria-labelledby={`${id}-label`}>
          {content}
        </div>
      )}
      {error && (
        <small id={`${id}-error`} role="alert" className="field-error">
          {error}
        </small>
      )}
    </div>
  );
}
export function Progress({ value, color }: { value: number; color?: string }) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label="Completion"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <div style={{ width: `${Math.min(value, 100)}%`, background: color }} />
    </div>
  );
}
export function Pagination({
  page,
  total,
  limit,
  onChange,
}: {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}) {
  if (total <= limit && page === 1) return null;
  return (
    <div className="pagination">
      <span>
        {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
      </span>
      <Button
        size="icon"
        variant="outline"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </Button>
      <Button
        size="icon"
        variant="outline"
        disabled={page * limit >= total}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}
export function Confirm({
  open,
  onClose,
  onConfirm,
  pending,
  title = 'Delete this item?',
  description = 'This action cannot be undone.',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pending?: boolean;
  title?: string;
  description?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose} title={title} description={description}>
      <div className="dialog-actions">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="destructive" disabled={pending} onClick={onConfirm}>
          {pending ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Dialog>
  );
}
export function CheckItem({ children }: { children: ReactNode }) {
  return (
    <span className="check-item">
      <Check size={15} />
      {children}
    </span>
  );
}
