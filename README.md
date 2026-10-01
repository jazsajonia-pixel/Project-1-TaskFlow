# TaskFlow

**Manage projects. Empower teams.**

A full-stack collaboration platform with a responsive React interface, an Express API, PostgreSQL (Neon) persistence, and live Socket.IO updates. Built as a professional portfolio project with real authentication, workspace permissions, private attachments, meaningful integration tests, and deployment configuration.

## Features

- Public landing page, registration, login, logout, email verification, and password recovery
- Opaque, revocable sessions in HTTP-only cookies; bcrypt password hashing
- Multiple workspaces; owner, administrator, member, and viewer roles
- Email invitations with hashed, expiring, single-use tokens
- Projects with overview, board, task list, members, files, activity, and settings
- Kanban drag-and-drop with keyboard controls, persisted ordering, and optimistic feedback
- Versioned task edits to detect concurrent changes instead of silently overwriting them
- Multiple assignees and labels, priorities, due dates, subtasks, and task conversation
- Comments with editing, deletion, and `@email@example.com` mentions
- Private attachments with signature-based validation and interchangeable storage providers
- Stored notifications, unread counts, deadline reminders, and email preferences
- Authorized Socket.IO rooms, live data refresh, and online presence
- Database-derived dashboards and project analytics using Recharts
- Debounced global search scoped to accessible workspaces
- Light/dark themes, mobile navigation, accessible dialogs, loading/error/empty states
- OpenAPI documentation, CI, Docker configuration, and realistic development seed data

## Stack

| Layer              | Technologies                                                                           |
| ------------------ | -------------------------------------------------------------------------------------- |
| Web                | React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui patterns with Radix primitives   |
| UI state and forms | React Router, TanStack Query, Zustand, React Hook Form, Zod                            |
| Interaction        | dnd-kit, Lucide, Recharts, Sonner                                                      |
| API                | Node.js 24, Express 5, TypeScript, Socket.IO, Zod                                      |
| Data               | PostgreSQL (Neon), Prisma 6, versioned SQL migrations                                  |
| Security           | bcrypt, opaque database sessions, Helmet, CORS, rate limits, origin checks             |
| Storage            | Local development storage, private S3 / Cloudflare R2, authenticated Cloudinary assets |
| Tests              | Vitest, React Testing Library, Supertest, real PostgreSQL and Socket.IO integration    |
| Tooling            | npm workspaces, ESLint, Prettier, Docker Compose, GitHub Actions                       |

## Architecture

```text
client/src/
  components/        Shared components and shadcn/ui primitives
  features/          Kanban, task editor, analytics, project panels
  pages/             Lazy-loaded route screens
  layouts/           Authenticated shell and live cache invalidation
  hooks/             Queries, mutations, session, debounce
  services/          Typed HTTP transport
  stores/            Persisted theme and selected workspace
  types/             API response types
  lib/               Display utilities
server/src/
  routes/            HTTP routing and OpenAPI registration
  controllers/       Zod validation and response adaptation
  services/          Business rules, permissions, database operations
  middleware/        Authentication, origin checks, centralized errors
  sockets/           Session-authenticated workspace/project rooms
  config/            Validated environment and Prisma client
  utils/             Errors and cryptographic token helpers
shared/validation.ts Shared form and API validation contracts
prisma/              Relational schema, SQL migrations, optional seed
tests/               Frontend, validation, and database integration tests
```

```mermaid
flowchart LR
  UI[React / TanStack Query] --> Routes[Express routes]
  Routes --> Controllers[Validated controllers]
  Controllers --> Services[Authorized services]
  Services --> Prisma[Prisma]
  Prisma --> PostgreSQL[(PostgreSQL / Neon)]
  Services --> Rooms[Socket.IO rooms]
  Rooms --> UI
  Services --> Storage[Private storage adapter]
  Services --> Jobs[Durable mail / cleanup jobs]
```

Relational models include users, sessions, auth tokens, workspaces, memberships, invitations, projects, project members, tasks, assignees, subtasks, labels, task labels, comments, attachments, notifications, activity, and durable jobs. Relationships use foreign keys, indexed access paths, unique constraints, and appropriate cascading deletion. JSON is limited to flexible activity metadata.

### Permission model

| Action                                               | Owner | Admin | Member | Viewer |
| ---------------------------------------------------- | :---: | :---: | :----: | :----: |
| Read workspace content                               |   ✓   |   ✓   |   ✓    |   ✓    |
| Create/edit tasks, comments, subtasks, labels, files |   ✓   |   ✓   |   ✓    |        |
| Create/manage projects and project teams             |   ✓   |   ✓   |        |        |
| Invite/manage members and viewers                    |   ✓   |   ✓   |        |        |
| Manage administrators                                |   ✓   |       |        |        |
| Delete workspace                                     |   ✓   |       |        |        |

Project membership identifies the project team. It is **not** a private-project access boundary: workspace members can read all projects in their workspace. Comments can only be edited/deleted by their author. Ownership cannot be removed through the membership API. Invitation acceptance requires a matching verified email.

## Screenshots

Screenshots from the running application with optional development seed data:

![Workspace dashboard](docs/screenshots/dashboard.png)

![Project Kanban board](docs/screenshots/board.png)

<details>
<summary>Mobile board</summary>

![Mobile board](docs/screenshots/mobile.png)

</details>

The public landing page includes an explicitly labeled illustrative product preview. Signed-in screens always use API data.

## Local installation

Requirements: Node.js 24, npm 11, Docker Compose (or an existing PostgreSQL database / Neon project).

```bash
git clone https://github.com/jazsajonia-pixel/Project-1-TaskFlow.git
cd Project-1-TaskFlow
npm install
cp .env.example .env
```

Edit `.env` before starting:

1. Choose a strong `POSTGRES_PASSWORD` value. Use URL-safe values or percent-encode credentials in `DATABASE_URL`.
2. Set `DATABASE_URL` to your PostgreSQL or Neon connection string (e.g. `postgresql://user:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require`).
3. Keep `CLIENT_URL=http://localhost:5173` and `SERVER_URL=http://localhost:4000` for Vite development.

```bash
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run dev
```

- Web: **http://localhost:5173**
- API health: **http://localhost:4000/api/health**
- Swagger: **http://localhost:5173/api/docs**
- OpenAPI JSON: **http://localhost:5173/api/openapi.json**

The browser sends API and Socket.IO traffic through the Vite proxy. Use the configured hostname consistently: `localhost` and `127.0.0.1` are different origins for authentication checks.

### Demo account and seed data

Seeding is optional and refused in production. A normal new account starts empty.

Set the following in your private `.env`:

```dotenv
DEMO_EMAIL=demo@taskflow.local
DEMO_PASSWORD=<choose-a-password-at-least-10-characters-long>
```

Then run:

```bash
npm run db:seed
```

Sign in with **the DEMO_EMAIL and DEMO_PASSWORD you configured**. Credentials are not embedded in application source. The seed creates Jazz Sajonia, a Studio workspace, Portfolio Website, Mobile App, Brand Refresh, team members, tasks, subtasks, labels, comments, notifications, and recent activity. Re-running it updates the demo password without duplicating the workspace. Other seeded members receive random passwords and are not shared login accounts.

### Email in development

Without SMTP, a durable job writes each email to a private JSON file under `UPLOAD_DIR/.mail/`. The worker runs every minute. With `npm run dev`, the server working directory is `server/`, so the default outbox is `server/uploads/.mail/`. Open the local file to obtain a verification, reset, or invitation link. These files contain sensitive tokens, are excluded from Git, and are never exposed by the web server.

SMTP is required in production. Jobs retry with exponential backoff up to 10 attempts; operators should monitor `MailJob` rows at the retry limit. Delivery is at least once: a crash after provider delivery and before job deletion can cause a duplicate email. Email notification preferences apply to activity notifications; security and workspace invitation emails are always sent.

## Environment variables

See [`.env.example`](.env.example) for the full list.

| Variable                      | Purpose                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                | Prisma PostgreSQL / Neon connection string                                                 |
| `NODE_ENV`, `PORT`            | Runtime mode and API port                                                                  |
| `CLIENT_URL`                  | Exact browser origin; used for CORS, mutation origin checks, sockets, and email links      |
| `SERVER_URL`                  | Deployment API address                                                                     |
| `SESSION_DAYS`                | Session lifetime, 1–30 days; defaults to 7                                                 |
| `TRUST_PROXY_HOPS`            | Trusted proxy count; defaults to 0. Only enable behind a network-restricted reverse proxy. |
| `STORAGE_PROVIDER`            | `local`, `s3`, `r2`, or `cloudinary`                                                       |
| `UPLOAD_DIR`                  | Private local file and development mail directory                                          |
| `S3_*`                        | Bucket, region, optional endpoint, access key ID, and secret for S3/R2                     |
| `CLOUDINARY_*`                | Cloud name, API key, and API secret                                                        |
| `SMTP_*`, `MAIL_FROM`         | Email provider and sender                                                                  |
| `DEMO_EMAIL`, `DEMO_PASSWORD` | Optional seed account; never required by the application                                   |
| `COMPOSE_CLIENT_URL`          | Browser URL for full Docker deployment; defaults to `http://localhost:8080`                |
| `COMPOSE_NODE_ENV`            | Docker runtime mode; use `production` behind HTTPS                                         |

JWT secrets are not needed: TaskFlow stores only SHA-256 hashes of cryptographically random session tokens. Raw session tokens remain in HTTP-only cookies. Reset and invitation tokens are hashed in the database; email jobs temporarily hold the links needed for delivery.

## Database and migrations

```bash
npm run db:generate                 # Generate Prisma client
npm run db:migrate                  # Apply committed migrations
npx prisma migrate dev --name change_name  # Author a new migration locally
npm run db:seed                     # Optional development demo
```

Never use `db push` to deploy schema changes. Back up production databases before applying migrations. The integration suite uses a separate `taskflow_test` database and deletes only its test fixtures.

## Testing and quality gates

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:integration
npm run build
```

To run integration tests locally, create a separate PostgreSQL database named `taskflow_test` and grant your development database user access. Copy `.env` to `.env.test`, change `DATABASE_URL` to that database, set `NODE_ENV=test`, and use `UPLOAD_DIR=./uploads/test`.

```bash
node --env-file=.env.test node_modules/prisma/build/index.js migrate deploy
npm run test:integration
```

The suite refuses a connection without `/taskflow_test` in the database URL. Use a disposable local database: the suite clears users and workspaces before each run.

Coverage includes:

- Login and registration validation, error handling, and API submission
- Task creation, server-side filtering, and dashboard metrics
- Password hashing, duplicate accounts, cookie settings, logout, reset, verification, and expired sessions
- Workspace/project creation, role checks, tenant isolation, invitation ownership, and removal of access
- Persisted task order, assignees, labels, subtasks, and concurrent edit conflicts
- Comment authorship and mention notifications
- File signature checks, private downloads, deletion queues, and local email delivery
- Database-derived analytics, notification ownership, pagination limits, and OpenAPI availability
- Real Socket.IO connections, authorized rooms, update broadcasts, and presence

Frontend tests mock the HTTP boundary. Backend integration tests use real PostgreSQL and Socket.IO; they do not substitute an in-memory database. External storage providers and real SMTP delivery require their own deployment credentials and provider smoke checks.

## API documentation

Swagger UI is served at `/api/docs`; the machine-readable specification is `/api/openapi.json`. Route registration derives request schemas from the same Zod definitions that validate requests.

Success envelopes use `{ "success": true, "data": ... }`. Lists use `{ items, total, page, limit }`. Errors use `{ "success": false, "message": "...", "errors": ... }`. List limits are capped at 100. Search returns bounded results for each resource type. Boards load tasks in batches and expose “Load more”.

Mutating requests must send an `Origin` matching `CLIENT_URL`; browsers do this automatically. API clients must retain the login cookie and send that header. Task PATCH requests must include the last fetched `version`; stale edits return HTTP 409.

### Uploads and provider switching

Supported uploads: PDF, DOCX, PNG, JPEG, WebP, maximum 10 MB. Content signatures are checked independently of the supplied MIME type. Files are downloaded through an authenticated endpoint with attachment disposition and `nosniff`; no public upload directory is served.

`StorageProvider` exposes `put`, `get`, and `remove`. S3 and R2 use private objects; Cloudinary uses authenticated raw assets. Set the provider variables, restart the API, and verify an upload/download/delete round trip. Keep old provider credentials while old attachments still exist, because each record remembers its provider. Switching between different buckets/accounts for the same provider requires an object migration.

Deleting attachments, tasks, projects, or workspaces queues object deletion transactionally. Cleanup retries in the background. Monitor `StorageCleanup` rows that reach 10 failed attempts. Signature validation does not replace malware scanning; a scanning service can be added through the storage pipeline.

## Docker

For the complete stack:

```bash
docker compose up --build
```

Open **http://localhost:8080**. Compose waits for PostgreSQL, runs migrations, starts the API, then serves the client through Nginx. PostgreSQL and local uploads use named volumes. `docker compose down` preserves those volumes; `docker compose down -v` deletes them.

The default Compose mode uses HTTP for local evaluation. For a public deployment, terminate TLS, set `COMPOSE_NODE_ENV=production`, set `COMPOSE_CLIENT_URL` to the HTTPS origin, and configure SMTP. The production runtime refuses to start without an HTTPS client URL and SMTP host.

## Deployment

For detailed Vercel deployment instructions, refer to [docs/vercel-deployment.md](docs/vercel-deployment.md).

### Standard Deployment

1. Provision PostgreSQL / Neon and private object storage (or a persistent local volume for one server).
2. Install locked dependencies with `npm ci`, generate Prisma, and run `npm run build`.
3. Apply committed migrations once as a release job.
4. Run `node server/dist/server/src/index.js` with environment variables supplied by your platform.
5. Serve `client/dist` behind the same origin and proxy `/api` and `/socket.io` to the API. Forward WebSocket upgrades. `docker/nginx.conf` is a reference configuration.
6. Use HTTPS. Production cookies use `__Host-taskflow`, Secure, HttpOnly, SameSite=Lax, and Path=/.
7. Restrict direct API access when trusting proxy headers. Keep credentials in your platform’s secret manager.
8. Monitor health checks, job failures, database backups, capacity, and application logs.

The current realtime deployment is one API instance. Before scaling horizontally, add a Socket.IO Redis adapter, a shared rate-limit store, and coordinated worker scheduling. Mail and cleanup jobs already have database leases. Add session-expiration monitoring, centralized telemetry, and restore drills for your hosting environment.

## Future improvements

- Private projects with a separate project-level permission model
- Workspace ownership transfer and self-service account export/deletion
- Redis-backed horizontal scaling and dedicated background workers
- Calendar views, recurring tasks, and configurable custom workflows
- Malware scanning, image derivatives, and richer attachment previews
- OAuth/SSO, passkeys, and multi-factor authentication
- Full-text search and cursor pagination for very large workspaces

## Development conventions

Keep route handlers thin, validate before calling business services, and enforce authorization on the server. Add a regression test for a behavior change. Run the quality gates before proposing changes. Use conventional commit messages such as `feat: add task assignments` or `fix: reject stale task updates`.

No credentials, `.env` files, generated builds, uploaded files, or dependency directories belong in Git.
