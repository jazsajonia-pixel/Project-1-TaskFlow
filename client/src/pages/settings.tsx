import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace, useAction } from '../hooks/use-data';
import { useUI } from '../stores/ui';
import { api, json } from '../services/api';
import { PageHeading, Field, Empty, Loading, ErrorState, Confirm } from '../components/common';
import { Button } from '../components/ui/button';
import type { Workspace } from '../types';
export default function Settings() {
  const { workspace, role, isPending, error } = useWorkspace();
  if (isPending) return <Loading />;
  if (error) return <ErrorState error={error} />;
  return (
    <>
      <PageHeading
        eyebrow="MAKE IT YOURS"
        title="Workspace settings"
        description="A few details to help your team feel at home."
      />
      {workspace ? (
        <WorkspaceSettings key={workspace.id} workspace={workspace} role={role} />
      ) : (
        <Empty title="No workspace yet" description="Create a workspace from the overview." />
      )}
    </>
  );
}
function WorkspaceSettings({ workspace, role }: { workspace: Workspace; role?: string }) {
  const navigate = useNavigate();
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description ?? '');
  const [confirm, setConfirm] = useState(false);
  const manage = role === 'OWNER' || role === 'ADMIN';
  const save = useAction(
    () => api(`/workspaces/${workspace.id}`, json('PATCH', { name, description })),
    'Workspace updated',
  );
  const remove = useAction(
    () => api(`/workspaces/${workspace.id}`, json('DELETE')),
    'Workspace deleted',
  );
  return (
    <div className="settings-grid">
      <section className="panel settings-panel">
        <h2>Workspace details</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <fieldset disabled={!manage}>
            <Field label="Workspace name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={100}
                required
              />
            </Field>
            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
              />
            </Field>
            {manage && <Button disabled={save.isPending}>Save changes</Button>}
          </fieldset>
        </form>
      </section>
      <div>
        <section className="panel settings-panel">
          <h2>Workspace access</h2>
          <p>
            Owners have full control. Admins manage projects and members. Members collaborate on
            tasks. Viewers can read workspace content.
          </p>
          <p>
            Your role: <strong>{role?.toLowerCase()}</strong>
          </p>
        </section>
        {role === 'OWNER' && (
          <section className="panel settings-panel danger-panel">
            <h2>Delete workspace</h2>
            <p>All projects, tasks, comments, and memberships will be permanently removed.</p>
            <Button variant="destructive" onClick={() => setConfirm(true)}>
              Delete workspace
            </Button>
          </section>
        )}
      </div>
      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title={`Delete “${workspace.name}”?`}
        description="This permanently deletes the workspace and all its projects. This cannot be undone."
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(undefined, {
            onSuccess: () => {
              useUI.getState().setWorkspace(null);
              navigate('/app');
            },
          })
        }
      />
    </div>
  );
}
