import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import swagger from 'swagger-ui-express';
import { env } from './config/env.js';
import { db } from './config/db.js';
import { csrfGuard } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { router, openapi } from './routes/index.js';
export const app = express();
app.disable('x-powered-by');
if (env.TRUST_PROXY_HOPS) app.set('trust proxy', env.TRUST_PROXY_HOPS);
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.get('/api/health', async (_req, res) => {
  await db.$queryRaw`SELECT 1`;
  res.json({ success: true, data: { status: 'ok' } });
});
app.get('/api/openapi.json', (_req, res) => {
  res.json(openapi);
});
app.use(
  '/api/docs',
  helmet({ contentSecurityPolicy: false }),
  swagger.serve,
  swagger.setup(openapi),
);
app.use(
  '/api',
  rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please slow down.' },
  }),
  csrfGuard,
  router,
);
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});
app.use(errorHandler);
