# Deploying TaskFlow to Vercel

This guide provides step-by-step instructions for deploying TaskFlow to [Vercel](https://vercel.com).

## Prerequisites

1. A [Vercel account](https://vercel.com/signup).
2. A hosted MySQL 8 database compatible with Prisma (e.g., PlanetScale, Supabase, Railway, Aiven, or AWS RDS).
3. (Optional) Cloud storage credentials (e.g., AWS S3, Cloudflare R2, or Cloudinary) for task attachment uploads.
4. (Optional) SMTP provider credentials (e.g., SendGrid, Resend, Mailgun) for transactional emails.

## Setup Instructions

### 1. Push your repository to GitHub / GitLab / Bitbucket

Ensure your TaskFlow code is pushed to your Git provider repository.

### 2. Import Project into Vercel

1. Log in to the Vercel Dashboard and click **Add New > Project**.
2. Select your TaskFlow repository.
3. Vercel will automatically detect `vercel.json` and configure:
   - **Build Command:** `npm run vercel-build`
   - **Output Directory:** `client/dist`

### 3. Configure Environment Variables in Vercel

In the Vercel project setup or Settings > Environment Variables, add the following required environment variables:

| Environment Variable | Description                    | Example Value                              |
| -------------------- | ------------------------------ | ------------------------------------------ |
| `DATABASE_URL`       | Prisma MySQL connection string | `mysql://user:password@host:3306/taskflow` |
| `CLIENT_URL`         | Production application URL     | `https://your-app.vercel.app`              |
| `SERVER_URL`         | Production application API URL | `https://your-app.vercel.app`              |
| `NODE_ENV`           | Production environment mode    | `production`                               |

#### Optional / Additional Environment Variables

- **Storage Provider** (if handling attachment uploads):
  - `STORAGE_PROVIDER`: `s3`, `r2`, or `cloudinary`
  - `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (or Cloudinary equivalents)
- **SMTP Delivery** (required if `NODE_ENV=production`):
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`

### 4. Deploy

Click **Deploy**. Vercel will:

1. Run `npm run vercel-build` which generates the Prisma Client (`prisma generate`) and compiles the client frontend and server backend code.
2. Serve the React SPA static assets from `client/dist`.
3. Route API endpoints (`/api/*`) to the Vercel Serverless Function entrypoint (`api/index.ts`).

### 5. Run Database Migrations

Before using the app, ensure database schema migrations have been applied to your production database. Run from your local terminal pointing to your production database URL:

```bash
DATABASE_URL="mysql://user:password@host:3306/taskflow" npm run db:migrate
```

## Serverless Considerations & Limitations

- **WebSockets / Socket.IO:** Standard Vercel Serverless Functions do not maintain persistent WebSocket connections. HTTP polling will be used for API interactions. If real-time Socket.IO updates are strictly required, host the Node server process on a persistent host (such as Railway, Render, or Fly.io) or use a hosted WebSocket service.
- **File Uploads:** Local file uploads (`STORAGE_PROVIDER=local`) are ephemeral on serverless platforms like Vercel. Use an object storage provider (`s3`, `r2`, or `cloudinary`) for production deployments.
