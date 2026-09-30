import { Link } from 'react-router-dom';
import { Logo } from '../components/common';
export default function Legal({ type }: { type: 'privacy' | 'terms' }) {
  return (
    <main className="legal-page">
      <Logo />
      <Link to="/" className="back-link">
        ← Back to home
      </Link>
      <h1>{type === 'privacy' ? 'Privacy notice' : 'Terms of use'}</h1>
      <p className="muted">TaskFlow portfolio application · Last updated September 2026</p>
      {type === 'privacy' ? (
        <>
          <h2>Information stored</h2>
          <p>
            TaskFlow stores your account profile, a password hash, login sessions, workspace
            membership, and the project content you create, including uploaded files and comments.
          </p>
          <h2>How it is used</h2>
          <p>
            This information powers authentication, collaboration, notifications, and project
            analytics. Workspace content is visible to members of that workspace. Invitations and
            security links are delivered through the configured email provider.
          </p>
          <h2>Cookies and storage</h2>
          <p>
            An HTTP-only cookie maintains your session. Browser local storage remembers your theme
            and selected workspace. TaskFlow does not include advertising trackers.
          </p>
          <h2>Your choices</h2>
          <p>
            You can update your profile and email preferences, remove your own content where your
            role permits, and sign out to revoke your current session. Workspace owners control
            workspace deletion. Contact the deployment operator for account deletion or a data
            export.
          </p>
          <h2>Hosting and retention</h2>
          <p>
            The deployment operator controls database backups, storage providers, and retention.
            Deleted attachment files are queued for background removal. The operator must monitor
            failed cleanup jobs. Avoid uploading confidential information to a public portfolio
            demonstration.
          </p>
        </>
      ) : (
        <>
          <h2>Using TaskFlow</h2>
          <p>
            TaskFlow is a portfolio project provided for evaluation and collaboration. Keep your
            account credentials private and use the application only for content you are authorized
            to share.
          </p>
          <h2>Your content</h2>
          <p>
            You retain ownership of content you upload. By adding it to a workspace, you allow the
            application to store and share it with authorized workspace members.
          </p>
          <h2>Workspace responsibilities</h2>
          <p>
            Workspace owners and administrators manage access. Owners can delete a workspace and its
            contents. Do not upload unlawful material, malware, or content that violates another
            person’s rights.
          </p>
          <h2>Availability</h2>
          <p>
            This application is provided as available, without a service-level agreement.
            Demonstration data may be reset. Keep independent copies of important work.
          </p>
        </>
      )}
      <h2>Questions</h2>
      <p>
        Contact the project maintainer through{' '}
        <a href="https://github.com/jazsajonia-pixel/Project-1-TaskFlow/issues">
          the repository’s issue tracker
        </a>
        . Do not include passwords or private project data in public issues.
      </p>
    </main>
  );
}
