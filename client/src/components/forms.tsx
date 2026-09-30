import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { workspaceSchema, projectSchema } from '../../../shared/validation';
import { api, json } from '../services/api';
import { useAction, useWorkspace } from '../hooks/use-data';
import { useUI } from '../stores/ui';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Field } from './common';
import type { Project, Workspace } from '../types';
export function WorkspaceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof workspaceSchema>>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: '', description: '' },
  });
  const create = useAction(
    (data: z.infer<typeof workspaceSchema>) => api<Workspace>('/workspaces', json('POST', data)),
    'Workspace created',
  );
  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
      title="A new space for great work"
      description="Bring your team and projects together."
    >
      <form
        onSubmit={form.handleSubmit((data) =>
          create.mutate(data, {
            onSuccess: (result) => {
              useUI.getState().setWorkspace(result.id);
              form.reset();
              onClose();
              navigate('/app');
            },
          }),
        )}
      >
        <Field label="Workspace name" error={form.formState.errors.name?.message}>
          <input autoFocus placeholder="e.g. Acme Studio" {...form.register('name')} />
        </Field>
        <Field label="Description">
          <textarea placeholder="What will your team work on?" {...form.register('description')} />
        </Field>
        <div className="dialog-actions">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create workspace'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
export function ProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const schema = projectSchema.omit({ workspaceId: true });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', status: 'ACTIVE', color: '#635bff' },
  });
  const create = useAction(
    (data: z.infer<typeof schema>) =>
      api<Project>('/projects', json('POST', { ...data, workspaceId: workspace?.id })),
    'Project created',
  );
  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
      title="Let’s start something great"
      description={`Create a project in ${workspace?.name ?? 'your workspace'}.`}
    >
      <form
        onSubmit={form.handleSubmit((data) =>
          create.mutate(data, {
            onSuccess: (project) => {
              form.reset();
              onClose();
              navigate(`/app/projects/${project.id}`);
            },
          }),
        )}
      >
        <Field label="Project name" error={form.formState.errors.name?.message}>
          <input autoFocus placeholder="e.g. Website redesign" {...form.register('name')} />
        </Field>
        <Field label="Description">
          <textarea
            placeholder="A little context goes a long way…"
            {...form.register('description')}
          />
        </Field>
        <div className="form-row">
          <Field label="Project color">
            <input type="color" {...form.register('color')} />
          </Field>
          <Field label="Due date">
            <input
              type="date"
              onChange={(e) =>
                form.setValue(
                  'dueDate',
                  e.target.value ? new Date(e.target.value).toISOString() : null,
                )
              }
            />
          </Field>
        </div>
        <div className="dialog-actions">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={create.isPending || !workspace}>
            {create.isPending ? 'Creating…' : 'Create project'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
