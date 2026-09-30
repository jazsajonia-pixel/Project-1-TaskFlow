import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Mail, LogOut } from 'lucide-react';
import { useUser, useAction, useLogout } from '../hooks/use-data';
import { api, json } from '../services/api';
import { PageHeading, Field, Avatar, Loading } from '../components/common';
import { Button } from '../components/ui/button';
import type { User } from '../types';
export default function Profile() {
  const user = useUser();
  return user.data ? <ProfileForm user={user.data} /> : <Loading />;
}
function ProfileForm({ user }: { user: User }) {
  const client = useQueryClient();
  const logout = useLogout();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [bio, setBio] = useState(user.bio ?? '');
  const [avatar, setAvatar] = useState(user.avatar ?? '');
  const [emailNotifications, setEmailNotifications] = useState(user.emailNotifications);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const save = useAction(
    () =>
      api<User>(
        '/profile',
        json('PATCH', { name, email, bio, avatar: avatar || null, emailNotifications }),
      ),
    'Profile updated',
  );
  const change = useAction(
    () => api('/profile/password', json('POST', { currentPassword, password })),
    'Password changed. Please sign in again.',
  );
  const verify = useAction(
    () => api('/auth/resend-verification', json('POST')),
    'Verification email sent',
  );
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE ABOUT YOU"
        title="Your profile"
        description="The person behind the good work."
      />
      <div className="settings-grid">
        <section className="panel settings-panel">
          <div className="profile-avatar">
            <Avatar user={{ ...user, name, avatar: avatar || null }} size="large" />
            <div>
              <h2>{user.name}</h2>
              <p>{user.emailVerified ? 'Email verified' : 'Email verification pending'}</p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(undefined, { onSuccess: (u) => client.setQueryData(['user'], u) });
            }}
          >
            <Field label="Full name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={80}
                required
              />
            </Field>
            <Field label="Email address">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
                required
              />
            </Field>
            <Field label="Avatar URL">
              <input
                type="url"
                placeholder="https://…"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                maxLength={2000}
              />
            </Field>
            <Field label="Bio">
              <textarea
                placeholder="A few words about you and what you do."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
              />
            </Field>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
              />{' '}
              Email notifications
            </label>
            <p className="muted small">
              In-app notifications are always available. Security and invitation emails are always
              sent.
            </p>
            <Button disabled={save.isPending}>Save changes</Button>
          </form>
        </section>
        <div>
          {!user.emailVerified && (
            <section className="panel settings-panel">
              <h2>
                <Mail size={18} /> Verify your email
              </h2>
              <p>
                Check your inbox for a verification link. Verification is required to accept
                workspace invitations.
              </p>
              <Button variant="outline" disabled={verify.isPending} onClick={() => verify.mutate()}>
                Send verification email
              </Button>
            </section>
          )}
          <section className="panel settings-panel">
            <h2>
              <ShieldCheck size={18} /> Password & security
            </h2>
            <p>Changing your password signs you out of all devices.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                change.mutate(undefined, {
                  onSuccess: () => {
                    client.clear();
                    window.location.assign('/login');
                  },
                });
              }}
            >
              <Field label="Current password">
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </Field>
              <Field label="New password">
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={10}
                  maxLength={72}
                  required
                />
              </Field>
              <Button variant="outline" disabled={change.isPending}>
                Update password
              </Button>
            </form>
          </section>
          <Button variant="ghost" disabled={logout.isPending} onClick={() => logout.mutate()}>
            <LogOut size={16} /> Sign out
          </Button>
        </div>
      </div>
    </>
  );
}
