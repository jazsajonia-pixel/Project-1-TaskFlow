import type { RequestHandler } from 'express';
import { resolveSession } from '../services/auth.service.js';
import { AppError } from '../utils/errors.js';
import { env } from '../config/env.js';
export const cookieName = env.NODE_ENV === 'production' ? '__Host-taskflow' : 'taskflow';
export const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};
export const requireAuth: RequestHandler = async (req, res, next) => {
  const session = await resolveSession(req.cookies[cookieName]);
  if (!session) throw new AppError(401, 'Please sign in to continue');
  res.locals.user = session.user;
  res.locals.sessionId = session.id;
  next();
};
export const csrfGuard: RequestHandler = (req, _res, next) => {
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    req.headers.origin !== new URL(env.CLIENT_URL).origin
  )
    throw new AppError(403, 'Request origin is not allowed');
  next();
};
