import { useParams, Link, useNavigate } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';
import { useUser, useAction } from '../hooks/use-data';
import { api, json } from '../services/api';
import { useUI } from '../stores/ui';
import { Logo, Loading } from '../components/common';
import { Button } from '../components/ui/button';
export default function InvitationPage() {
  const { token } = useParams();
  const user = useUser();
  const navigate = useNavigate();
  const accept = useAction(
    () => api<{ workspaceId: string }>('/invitations/accept', json('POST', { token })),
    'Welcome to the team',
  );
  return (
    <main className="invitation-page">
      <Logo />
      <section className="panel">
        <span className="empty-icon">
          <Users size={32} />
        </span>
        <h1>Good things happen together.</h1>
        <p>
          You’ve been invited to a TaskFlow workspace. Join your team and make your next big idea
          happen.
        </p>
        {user.isPending ? (
          <Loading compact />
        ) : user.data ? (
          <>
            <p className="muted">Signed in as {user.data.email}</p>
            {!user.data.emailVerified && (
              <p className="notice">
                Verify your email first. You can resend the link from{' '}
                <Link to="/app/profile">your profile</Link>.
              </p>
            )}
            <Button
              disabled={accept.isPending || !user.data.emailVerified}
              onClick={() =>
                accept.mutate(undefined, {
                  onSuccess: (r) => {
                    useUI.getState().setWorkspace(r.workspaceId);
                    navigate('/app');
                  },
                })
              }
            >
              Accept invitation <ArrowRight size={16} />
            </Button>
          </>
        ) : (
          <div className="inline-actions">
            <Button asChild>
              <Link to={`/login?next=${encodeURIComponent(`/invitations/${token}`)}`}>
                Sign in to join
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/register?next=${encodeURIComponent(`/invitations/${token}`)}`}>
                Create account
              </Link>
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
