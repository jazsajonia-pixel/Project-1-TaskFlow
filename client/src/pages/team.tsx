import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserPlus, Trash2, Mail, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace, useAction } from '../hooks/use-data';
import { api, json } from '../services/api';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import {
  PageHeading,
  Avatar,
  Badge,
  Loading,
  ErrorState,
  Empty,
  Pagination,
  Field,
  Confirm,
} from '../components/common';
import type { Page, Member, Invitation } from '../types';
export default function Team() {
  const { workspace, canManage, role } = useWorkspace();
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [workspace?.id]);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [removeId, setRemoveId] = useState<string>();
  const members = useQuery({
    queryKey: ['members', workspace?.id, page],
    queryFn: () => api<Page<Member>>(`/workspaces/${workspace!.id}/members?page=${page}&limit=20`),
    enabled: !!workspace,
  });
  const invitations = useQuery({
    queryKey: ['invitations', workspace?.id],
    queryFn: () => api<Invitation[]>(`/workspaces/${workspace!.id}/invitations`),
    enabled: !!workspace && canManage,
  });
  const invite = useAction(
    () =>
      api<Invitation>(
        `/workspaces/${workspace?.id}/invitations`,
        json('POST', { email, role: inviteRole }),
      ),
    'Invitation sent',
  );
  const change = useAction(
    ({ id, role }: { id: string; role: string }) =>
      api(`/workspaces/${workspace?.id}/members/${id}`, json('PATCH', { role })),
    'Role updated',
  );
  const remove = useAction(
    () => api(`/workspaces/${workspace?.id}/members/${removeId}`, json('DELETE')),
    'Member removed',
  );
  const revoke = useAction(
    (id: string) => api(`/workspaces/${workspace?.id}/invitations/${id}`, json('DELETE')),
    'Invitation revoked',
  );
  return (
    <>
      <PageHeading
        eyebrow="BETTER, TOGETHER"
        title="Your people"
        description="Different talents. Shared goals. One great team."
        actions={
          canManage && (
            <Button
              onClick={() => {
                setOpen(true);
                setLink('');
                setCopied(false);
              }}
            >
              <UserPlus size={16} /> Invite member
            </Button>
          )
        }
      />
      {!workspace ? (
        <Empty
          title="Create a workspace first"
          description="Then invite your people and start collaborating."
        />
      ) : members.isPending ? (
        <Loading />
      ) : members.error ? (
        <ErrorState error={members.error} />
      ) : (
        <section className="panel">
          <header className="panel-header">
            <h2>
              Workspace members <span className="count-pill">{members.data.total}</span>
            </h2>
          </header>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.data.items.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className="person-cell">
                        <Avatar user={m.user} />
                        <strong>{m.user.name}</strong>
                      </span>
                    </td>
                    <td>{m.user.email}</td>
                    <td>
                      {canManage &&
                      m.role !== 'OWNER' &&
                      (role === 'OWNER' || m.role !== 'ADMIN') ? (
                        <select
                          aria-label={`Role for ${m.user.name}`}
                          value={m.role}
                          disabled={change.isPending}
                          onChange={(e) => change.mutate({ id: m.id, role: e.target.value })}
                        >
                          {role === 'OWNER' && <option value="ADMIN">Admin</option>}
                          <option value="MEMBER">Member</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      ) : (
                        <Badge value={m.role} />
                      )}
                    </td>
                    <td>
                      {canManage &&
                        m.role !== 'OWNER' &&
                        (role === 'OWNER' || m.role !== 'ADMIN') && (
                          <button
                            className="icon-button"
                            onClick={() => setRemoveId(m.id)}
                            aria-label={`Remove ${m.user.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...members.data} onChange={setPage} />
        </section>
      )}
      {canManage && (
        <section className="panel invitations-panel">
          <header className="panel-header">
            <div>
              <h2>Invitations</h2>
              <p>Make room for a few more good ideas.</p>
            </div>
          </header>
          {invitations.error ? (
            <ErrorState error={invitations.error} />
          ) : invitations.isPending ? (
            <Loading compact />
          ) : invitations.data?.length ? (
            <div className="invitation-list">
              {invitations.data.map((i) => (
                <div key={i.id}>
                  <span className="mail-icon">
                    <Mail size={18} />
                  </span>
                  <span>
                    <strong>{i.email}</strong>
                    <small>{i.role.toLowerCase()}</small>
                  </span>
                  <Badge value={i.status} />
                  {i.status === 'PENDING' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={revoke.isPending}
                      onClick={() => revoke.mutate(i.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Everyone’s here" description="New invitations will appear here." />
          )}
        </section>
      )}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Good work deserves good company"
        description="Invite someone to your workspace."
      >
        {link ? (
          <div className="invite-success">
            <Check size={30} />
            <h3>Invitation ready</h3>
            <p>
              We’ve sent an email. You can also share this private invitation link with the invited
              person.
            </p>
            <input value={link} readOnly aria-label="Invitation link" />
            <Button
              variant="outline"
              onClick={() =>
                void navigator.clipboard
                  .writeText(link)
                  .then(() => setCopied(true))
                  .catch(() => toast.error('Could not copy. Select and copy the link manually.'))
              }
            >
              <Copy size={15} />
              {copied ? 'Copied' : 'Copy invitation link'}
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              invite.mutate(undefined, {
                onSuccess: (result) => {
                  setLink(result.inviteUrl ?? '');
                  setEmail('');
                },
              });
            }}
          >
            <Field label="Email address">
              <input
                type="email"
                placeholder="teammate@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
              />
            </Field>
            <Field label="Workspace role">
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                {role === 'OWNER' && (
                  <option value="ADMIN">Admin — manage projects and members</option>
                )}
                <option value="MEMBER">Member — collaborate on tasks</option>
                <option value="VIEWER">Viewer — read-only access</option>
              </select>
            </Field>
            <p className="muted small">
              The invitation expires in 7 days. The recipient must verify their email to join.
            </p>
            <div className="dialog-actions">
              <Button disabled={invite.isPending}>
                <Mail size={16} /> Send invitation
              </Button>
            </div>
          </form>
        )}
      </Dialog>
      <Confirm
        open={!!removeId}
        onClose={() => setRemoveId(undefined)}
        title="Remove this member?"
        description="They’ll lose access to this workspace and be unassigned from its tasks."
        pending={remove.isPending}
        onConfirm={() => remove.mutate(undefined, { onSuccess: () => setRemoveId(undefined) })}
      />
    </>
  );
}
