import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Plus, Trash2 } from 'lucide-react';
import { useAction, useWorkspace } from '../hooks/use-data';
import { api, json } from '../services/api';
import { ActivityFeed } from './activity';
import { Stats, ProgressChart, StatusChart } from './analytics';
import {
  Loading,
  ErrorState,
  Empty,
  Pagination,
  Avatar,
  Field,
  Confirm,
} from '../components/common';
import { Button } from '../components/ui/button';
import { pretty, date } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import type { Project, Page, Activity, Attachment, Analytics, Member } from '../types';
export function ProjectOverview({ project }: { project: Project }) {
  const query = useQuery({
    queryKey: ['analytics', project.id],
    queryFn: () => api<Analytics>(`/projects/${project.id}/analytics`),
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  return (
    <>
      <div className="project-description panel">
        <h2>About this project</h2>
        <p>
          {project.description ||
            'Every great project begins with an idea. Add a description in settings.'}
        </p>
        <div>
          <span>
            Started <strong>{date(project.startDate)}</strong>
          </span>
          <span>
            Due <strong>{date(project.dueDate)}</strong>
          </span>
          <span>
            Status <strong>{pretty(project.status)}</strong>
          </span>
        </div>
      </div>
      <Stats data={query.data} />
      <div className="dashboard-charts">
        <ProgressChart data={query.data} />
        <StatusChart data={query.data} />
      </div>
      <section className="panel priority-summary">
        <h2>Tasks by priority</h2>
        <div>
          {query.data.byPriority.map((p) => (
            <span key={p.name}>
              {pretty(p.name)}
              <strong>{p.value}</strong>
            </span>
          ))}
        </div>
      </section>
    </>
  );
}
export function ProjectActivity({ projectId }: { projectId: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['activity', projectId, page],
    queryFn: () => api<Page<Activity>>(`/projects/${projectId}/activity?page=${page}&limit=20`),
  });
  return (
    <section className="panel">
      {query.isPending ? (
        <Loading compact />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : query.data.items.length ? (
        <>
          <ActivityFeed items={query.data.items} />
          <Pagination {...query.data} onChange={setPage} />
        </>
      ) : (
        <Empty title="A new story is starting" description="Project activity will show up here." />
      )}
    </section>
  );
}
export function ProjectFiles({ projectId }: { projectId: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['files', projectId, page],
    queryFn: () => api<Page<Attachment>>(`/projects/${projectId}/files?page=${page}&limit=20`),
  });
  return (
    <section className="panel">
      {query.isPending ? (
        <Loading compact />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : query.data.items.length ? (
        <>
          <div className="file-grid">
            {query.data.items.map((a) => (
              <a className="file-card" key={a.id} href={`/api/attachments/${a.id}/download`}>
                <FileText size={28} />
                <strong>{a.originalFilename}</strong>
                <span>{a.task?.title}</span>
                <small>
                  {(a.size / 1024).toFixed(0)} KB · {date(a.createdAt)}
                </small>
                <Download size={16} />
              </a>
            ))}
          </div>
          <Pagination {...query.data} onChange={setPage} />
        </>
      ) : (
        <Empty
          title="Everything in its place"
          description="Attach files to a task and they’ll appear here."
        />
      )}
    </section>
  );
}
export function ProjectMembers({ project }: { project: Project }) {
  const { canManage } = useWorkspace();
  const [userId, setUserId] = useState('');
  const [removeId, setRemoveId] = useState<string>();
  const query = useQuery({
    queryKey: ['members', project.workspaceId, 'picker'],
    queryFn: () => api<Page<Member>>(`/workspaces/${project.workspaceId}/members?limit=100`),
  });
  const add = useAction(
    () => api(`/projects/${project.id}/members`, json('POST', { userId })),
    'Team member added',
  );
  const remove = useAction(
    () => api(`/projects/${project.id}/members/${removeId}`, json('DELETE')),
    'Team member removed',
  );
  return (
    <section className="panel settings-panel">
      <h2>A little teamwork goes a long way.</h2>
      <p className="muted">
        Everyone in the workspace can view this project. Add people to highlight the project team.
      </p>
      {canManage && (
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate(undefined, { onSuccess: () => setUserId('') });
          }}
        >
          <select
            aria-label="Add project member"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">Choose a workspace member</option>
            {query.data?.items
              .filter((m) => !project.members.some((p) => p.userId === m.userId))
              .map((m) => (
                <option key={m.id} value={m.userId}>
                  {m.user.name}
                </option>
              ))}
          </select>
          <Button disabled={!userId || add.isPending}>
            <Plus size={15} /> Add member
          </Button>
        </form>
      )}
      {query.error && <p className="form-error">{query.error.message}</p>}
      <div className="member-cards">
        {project.members.map((m) => (
          <div className="member-card" key={m.userId}>
            <Avatar user={m.user} />
            <strong>{m.user.name}</strong>
            {canManage && (
              <button
                className="icon-button"
                aria-label={`Remove ${m.user.name}`}
                onClick={() => setRemoveId(m.userId)}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
      </div>
      <Confirm
        open={!!removeId}
        onClose={() => setRemoveId(undefined)}
        title="Remove from project team?"
        description="They will still have access through their workspace membership."
        pending={remove.isPending}
        onConfirm={() => remove.mutate(undefined, { onSuccess: () => setRemoveId(undefined) })}
      />
    </section>
  );
}
export function ProjectSettings({ project }: { project: Project }) {
  const { canManage, canWrite } = useWorkspace();
  const navigate = useNavigate();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [status, setStatus] = useState(project.status);
  const [dueDate, setDueDate] = useState(project.dueDate?.slice(0, 10) ?? '');
  const [startDate, setStartDate] = useState(project.startDate?.slice(0, 10) ?? '');
  const [color, setColor] = useState(project.color);
  const [label, setLabel] = useState('');
  const [labelColor, setLabelColor] = useState('#635bff');
  const [confirm, setConfirm] = useState(false);
  const save = useAction(
    () =>
      api(
        `/projects/${project.id}`,
        json('PATCH', {
          name,
          description,
          status,
          color,
          startDate: startDate ? new Date(startDate).toISOString() : null,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      ),
    'Project updated',
  );
  const remove = useAction(() => api(`/projects/${project.id}`, json('DELETE')), 'Project deleted');
  const addLabel = useAction(
    () => api(`/projects/${project.id}/labels`, json('POST', { name: label, color: labelColor })),
    'Label created',
  );
  const deleteLabel = useAction(
    (id: string) => api(`/projects/${project.id}/labels/${id}`, json('DELETE')),
    'Label deleted',
  );
  return (
    <div className="settings-grid">
      <section className="panel settings-panel">
        <h2>Project details</h2>
        <p className="muted">Give your team a little context.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <fieldset disabled={!canManage}>
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={120}
              />
            </Field>
            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={5000}
              />
            </Field>
            <div className="form-row">
              <Field label="Status">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Project['status'])}
                >
                  {['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'].map((s) => (
                    <option key={s} value={s}>
                      {pretty(s)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Color">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
              </Field>
            </div>
            <div className="form-row">
              <Field label="Start date">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Field>
              <Field label="Due date">
                <input
                  type="date"
                  value={dueDate}
                  min={startDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </Field>
            </div>
            {canManage && <Button disabled={save.isPending}>Save changes</Button>}
          </fieldset>
        </form>
      </section>
      <div>
        <section className="panel settings-panel">
          <h2>Project labels</h2>
          <p className="muted">A little color. A lot of clarity.</p>
          <div className="settings-labels">
            {project.labels.map((l) => (
              <div key={l.id}>
                <span
                  className="task-label"
                  style={{
                    color: `color-mix(in srgb, ${l.color} 55%, var(--text))`,
                    background: `${l.color}15`,
                  }}
                >
                  {l.name}
                </span>
                {canWrite && (
                  <button
                    className="icon-button"
                    aria-label={`Delete label ${l.name}`}
                    disabled={deleteLabel.isPending}
                    onClick={() => deleteLabel.mutate(l.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {canWrite && (
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                addLabel.mutate(undefined, { onSuccess: () => setLabel('') });
              }}
            >
              <input
                aria-label="Label name"
                placeholder="New label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={40}
                required
              />
              <input
                aria-label="Label color"
                type="color"
                value={labelColor}
                onChange={(e) => setLabelColor(e.target.value)}
              />
              <Button
                size="icon"
                aria-label="Create label"
                disabled={addLabel.isPending || !label.trim()}
              >
                <Plus size={16} />
              </Button>
            </form>
          )}
        </section>
        {canManage && (
          <section className="panel settings-panel danger-panel">
            <h2>Delete project</h2>
            <p>
              This removes all tasks, comments, and project history. You can archive it instead
              using the status field.
            </p>
            <Button variant="destructive" onClick={() => setConfirm(true)}>
              Delete project
            </Button>
          </section>
        )}
      </div>
      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title={`Delete “${project.name}”?`}
        pending={remove.isPending}
        onConfirm={() => remove.mutate(undefined, { onSuccess: () => navigate('/app/projects') })}
      />
    </div>
  );
}
