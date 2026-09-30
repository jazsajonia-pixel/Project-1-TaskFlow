import { ActivityFeed } from './activity';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Plus,
  Trash2,
  Paperclip,
  Send,
  FileText,
  Download,
  Pencil,
  Check,
  MessageSquare,
  ListChecks,
} from 'lucide-react';
import { taskSchema } from '../../../shared/validation';
import { api, json } from '../services/api';
import { useAction, useUser, useWorkspace } from '../hooks/use-data';
import { Dialog } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import {
  Field,
  Avatar,
  Loading,
  ErrorState,
  Confirm,
  Progress,
  Pagination,
} from '../components/common';
import { pretty, priorities, statuses, relative } from '../lib/utils';
import type { Project, Task, Member, Page, Comment, TaskStatus, Activity } from '../types';
type TaskValues = z.infer<typeof taskSchema>;
export function TaskDialog({
  project,
  taskId,
  open,
  onClose,
  defaultStatus = 'TODO',
}: {
  project: Project;
  taskId?: string;
  open: boolean;
  onClose: () => void;
  defaultStatus?: TaskStatus;
}) {
  const query = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => api<Task>(`/tasks/${taskId}`),
    enabled: !!taskId && open,
  });
  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
      title={taskId ? 'Task details' : 'Make your next move'}
      description={project.name}
      wide
    >
      {taskId && query.isPending ? (
        <Loading compact />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <TaskEditor
          key={taskId ?? `new-${defaultStatus}`}
          project={project}
          task={query.data}
          defaultStatus={defaultStatus}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}
function TaskEditor({
  project,
  task,
  defaultStatus,
  onClose,
}: {
  project: Project;
  task?: Task;
  defaultStatus: TaskStatus;
  onClose: () => void;
}) {
  const { canWrite } = useWorkspace();
  const [version, setVersion] = useState(task?.version ?? 0);
  const [confirm, setConfirm] = useState(false);
  const form = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? defaultStatus,
      priority: task?.priority ?? 'MEDIUM',
      dueDate: task?.dueDate ?? null,
      assigneeIds: task?.assignees.map((a) => a.userId) ?? [],
      labelIds: task?.labels.map((l) => l.labelId) ?? [],
    },
  });
  const members = useQuery({
    queryKey: ['members', project.workspaceId, 'picker'],
    queryFn: () => api<Page<Member>>(`/workspaces/${project.workspaceId}/members?limit=100`),
  });
  const save = useAction(
    (values: TaskValues) =>
      api<Task>(
        task ? `/tasks/${task.id}` : `/projects/${project.id}/tasks`,
        json(task ? 'PATCH' : 'POST', { ...values, ...(task && { version }) }),
      ),
    task ? 'Task updated' : 'Task created',
  );
  const remove = useAction(() => api(`/tasks/${task?.id}`, json('DELETE')), 'Task deleted');
  const selectedLabels = form.watch('labelIds');
  const selectedAssignees = form.watch('assigneeIds');
  return (
    <div className="task-editor">
      <form
        onSubmit={form.handleSubmit((values) =>
          save.mutate(values, {
            onSuccess: (result) => {
              setVersion(result.version);
              if (!task) onClose();
            },
          }),
        )}
      >
        <fieldset disabled={!canWrite || save.isPending}>
          <Field label="Task title" error={form.formState.errors.title?.message}>
            <input
              autoFocus
              className="task-title-input"
              placeholder="What needs to happen?"
              {...form.register('title')}
            />
          </Field>
          <Field label="Description" error={form.formState.errors.description?.message}>
            <textarea
              rows={3}
              placeholder="Add a little context, a useful link, or your next steps…"
              {...form.register('description')}
            />
          </Field>
          <div className="task-metadata">
            <Field label="Status">
              <select {...form.register('status')}>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {pretty(s)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select {...form.register('priority')}>
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {pretty(p)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Due date">
              <input
                type="date"
                value={form.watch('dueDate')?.slice(0, 10) ?? ''}
                onChange={(e) =>
                  form.setValue(
                    'dueDate',
                    e.target.value ? new Date(`${e.target.value}T23:59:59Z`).toISOString() : null,
                  )
                }
              />
            </Field>
          </div>
          <Field label="Assignees">
            <div className="assignee-picker">
              {members.data?.items.map((m) => (
                <label
                  key={m.id}
                  className={selectedAssignees.includes(m.userId) ? 'selected' : ''}
                >
                  <input
                    type="checkbox"
                    checked={selectedAssignees.includes(m.userId)}
                    onChange={(e) =>
                      form.setValue(
                        'assigneeIds',
                        e.target.checked
                          ? [...selectedAssignees, m.userId]
                          : selectedAssignees.filter((id) => id !== m.userId),
                      )
                    }
                  />
                  <Avatar user={m.user} size="small" />
                  <span>{m.user.name}</span>
                </label>
              ))}
              {members.error && (
                <span className="field-error">Couldn’t load members. Try reopening the task.</span>
              )}
            </div>
          </Field>
          {project.labels?.length > 0 && (
            <Field label="Labels">
              <div className="label-picker">
                {project.labels.map((l) => (
                  <label
                    key={l.id}
                    className={`task-label ${selectedLabels.includes(l.id) ? 'selected' : ''}`}
                    style={{
                      color: `color-mix(in srgb, ${l.color} 55%, var(--text))`,
                      background: `${l.color}14`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLabels.includes(l.id)}
                      onChange={(e) =>
                        form.setValue(
                          'labelIds',
                          e.target.checked
                            ? [...selectedLabels, l.id]
                            : selectedLabels.filter((id) => id !== l.id),
                        )
                      }
                    />
                    {l.name}
                    {selectedLabels.includes(l.id) && <Check size={12} />}
                  </label>
                ))}
              </div>
            </Field>
          )}
        </fieldset>
        {task && task.version !== version && (
          <p className="notice">
            This task changed while you were editing. Reopen it to load the latest version before
            saving.
          </p>
        )}
        {canWrite && (
          <div className="task-save-row">
            {task && (
              <Button
                type="button"
                variant="ghost"
                className="danger-text"
                onClick={() => setConfirm(true)}
              >
                <Trash2 size={15} /> Delete task
              </Button>
            )}
            <Button disabled={save.isPending || (!!task && task.version !== version)}>
              {save.isPending ? 'Saving…' : task ? 'Save changes' : 'Create task'}
            </Button>
          </div>
        )}
      </form>
      {task && (
        <>
          <Subtasks task={task} canWrite={canWrite} />
          <Attachments task={task} canWrite={canWrite} />
          <Comments task={task} canWrite={canWrite} />
          <TaskActivity taskId={task.id} />
        </>
      )}
      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete this task?"
        description="Its subtasks, comments, and attachment records will also be removed."
        pending={remove.isPending}
        onConfirm={() => remove.mutate(undefined, { onSuccess: onClose })}
      />
    </div>
  );
}
function Subtasks({ task, canWrite }: { task: Task; canWrite: boolean }) {
  const [title, setTitle] = useState('');
  const create = useAction(() => api(`/tasks/${task.id}/subtasks`, json('POST', { title })));
  const change = useAction(({ id, completed }: { id: string; completed: boolean }) =>
    api(`/tasks/${task.id}/subtasks/${id}`, json('PATCH', { completed })),
  );
  const remove = useAction((id: string) => api(`/tasks/${task.id}/subtasks/${id}`, json('DELETE')));
  const complete = task.subtasks.filter((s) => s.completed).length;
  return (
    <section className="task-section">
      <h3>
        <ListChecks size={17} /> Subtasks{' '}
        <span>
          {complete}/{task.subtasks.length}
        </span>
      </h3>
      {task.subtasks.length > 0 && <Progress value={(complete / task.subtasks.length) * 100} />}
      <div className="subtasks">
        {task.subtasks.map((s) => (
          <div key={s.id}>
            <label>
              <input
                type="checkbox"
                checked={s.completed}
                disabled={!canWrite || change.isPending}
                onChange={(e) => change.mutate({ id: s.id, completed: e.target.checked })}
              />
              <span className={s.completed ? 'completed-text' : ''}>{s.title}</span>
            </label>
            {canWrite && (
              <button
                className="icon-button"
                aria-label={`Delete subtask ${s.title}`}
                disabled={remove.isPending}
                onClick={() => remove.mutate(s.id)}
              >
                <XIcon />
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
            create.mutate(undefined, { onSuccess: () => setTitle('') });
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a small step…"
            aria-label="Subtask title"
            maxLength={200}
          />
          <Button variant="outline" size="sm" disabled={!title.trim() || create.isPending}>
            <Plus size={16} /> Add
          </Button>
        </form>
      )}
    </section>
  );
}
function XIcon() {
  return <Trash2 size={14} />;
}
function Attachments({ task, canWrite }: { task: Task; canWrite: boolean }) {
  const upload = useAction((file: File) => {
    const data = new FormData();
    data.append('file', file);
    return api(`/tasks/${task.id}/attachments`, { method: 'POST', body: data });
  }, 'File attached');
  const [deleteId, setDeleteId] = useState<string>();
  const remove = useAction(
    () => api(`/attachments/${deleteId}`, json('DELETE')),
    'Attachment deleted',
  );
  return (
    <section className="task-section">
      <h3>
        <Paperclip size={16} /> Attachments <span>{task.attachments.length}</span>
      </h3>
      {task.attachments.map((a) => (
        <div className="attachment-row" key={a.id}>
          <FileText size={21} />
          <div>
            <strong>{a.originalFilename}</strong>
            <small>{(a.size / 1024).toFixed(0)} KB</small>
          </div>
          <a
            href={`/api/attachments/${a.id}/download`}
            className="icon-button"
            aria-label={`Download ${a.originalFilename}`}
          >
            <Download size={16} />
          </a>
          {canWrite && (
            <button
              className="icon-button"
              onClick={() => setDeleteId(a.id)}
              aria-label={`Delete ${a.originalFilename}`}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ))}
      {canWrite && (
        <label className="upload-zone">
          <Paperclip size={19} />
          <span>
            {upload.isPending ? 'Uploading…' : 'Click to attach a file'}
            <small>PDF, DOCX, PNG, JPG, WebP · Up to 10 MB</small>
          </span>
          <input
            type="file"
            className="sr-only"
            aria-label="Attach file"
            accept=".pdf,.docx,.png,.jpg,.jpeg,.webp"
            disabled={upload.isPending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
              e.target.value = '';
            }}
          />
        </label>
      )}
      <Confirm
        open={!!deleteId}
        onClose={() => setDeleteId(undefined)}
        pending={remove.isPending}
        title="Delete attachment?"
        onConfirm={() => remove.mutate(undefined, { onSuccess: () => setDeleteId(undefined) })}
      />
    </section>
  );
}
function Comments({ task, canWrite }: { task: Task; canWrite: boolean }) {
  const user = useUser();
  const [body, setBody] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<string>();
  const [draft, setDraft] = useState('');
  const [deleteId, setDeleteId] = useState<string>();
  const comments = useQuery({
    queryKey: ['comments', task.id, page],
    queryFn: () => api<Page<Comment>>(`/tasks/${task.id}/comments?page=${page}&limit=10`),
  });
  const post = useAction(() => api(`/tasks/${task.id}/comments`, json('POST', { body })));
  const edit = useAction(() =>
    api(`/tasks/${task.id}/comments/${editing}`, json('PATCH', { body: draft })),
  );
  const remove = useAction(() => api(`/tasks/${task.id}/comments/${deleteId}`, json('DELETE')));
  return (
    <section className="task-section">
      <h3>
        <MessageSquare size={17} /> Conversation <span>{comments.data?.total ?? 0}</span>
      </h3>
      {canWrite && (
        <form
          className="comment-form"
          onSubmit={(e) => {
            e.preventDefault();
            post.mutate(undefined, {
              onSuccess: () => {
                setBody('');
                setPage(1);
              },
            });
          }}
        >
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share an update. Mention someone with @email@example.com"
            aria-label="Comment"
            maxLength={5000}
          />
          <Button size="sm" disabled={!body.trim() || post.isPending}>
            <Send size={14} /> Send
          </Button>
        </form>
      )}
      {comments.isPending ? (
        <Loading compact />
      ) : comments.error ? (
        <ErrorState error={comments.error} />
      ) : comments.data.items.length ? (
        <div className="comments">
          {comments.data.items.map((c) => (
            <article key={c.id}>
              <Avatar user={c.user} size="small" />
              <div className="comment-content">
                <header>
                  <strong>{c.user.name}</strong>
                  <small>
                    {relative(c.createdAt)}
                    {c.updatedAt !== c.createdAt && ' · edited'}
                  </small>
                  {canWrite && c.userId === user.data?.id && (
                    <>
                      <button
                        className="icon-button"
                        aria-label="Edit comment"
                        onClick={() => {
                          setEditing(c.id);
                          setDraft(c.body);
                        }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Delete comment"
                        onClick={() => setDeleteId(c.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </header>
                {editing === c.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      edit.mutate(undefined, { onSuccess: () => setEditing(undefined) });
                    }}
                  >
                    <textarea
                      aria-label="Edit comment text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      maxLength={5000}
                    />
                    <div className="inline-actions">
                      <Button size="sm" disabled={!draft.trim() || edit.isPending}>
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(undefined)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <p>{c.body}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted small">Start a conversation. Great work happens together.</p>
      )}
      {comments.data && <Pagination {...comments.data} onChange={setPage} />}
      <Confirm
        open={!!deleteId}
        onClose={() => setDeleteId(undefined)}
        title="Delete your comment?"
        pending={remove.isPending}
        onConfirm={() => remove.mutate(undefined, { onSuccess: () => setDeleteId(undefined) })}
      />
    </section>
  );
}

function TaskActivity({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['task-activity', taskId, page],
    queryFn: () => api<Page<Activity>>(`/tasks/${taskId}/activity?page=${page}&limit=10`),
    enabled: open,
  });
  return (
    <details className="task-section task-history" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Task activity</summary>
      {open &&
        (query.isPending ? (
          <Loading compact />
        ) : query.error ? (
          <ErrorState error={query.error} />
        ) : (
          <>
            <ActivityFeed items={query.data.items} />
            <Pagination {...query.data} onChange={setPage} />
          </>
        ))}
    </details>
  );
}
