import { disconnectSessions } from '../services/events.service.js';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import {
  loginSchema,
  registerSchema,
  emailSchema,
  passwordSchema,
  tokenSchema,
} from '../../../shared/validation.js';
import * as auth from '../services/auth.service.js';
import { db } from '../config/db.js';
import { env } from '../config/env.js';
import { cookieName, cookieOptions } from '../middleware/auth.js';
import { hashToken } from '../utils/tokens.js';
import { endpoint, requestSchema } from './endpoint.js';
export const register: RequestHandler = async (req, res) => {
  const result = await auth.register(registerSchema.parse(req.body));
  res
    .cookie(cookieName, result.token, { ...cookieOptions, maxAge: env.SESSION_DAYS * 86400000 })
    .status(201)
    .json({ success: true, data: result.user });
};
export const login: RequestHandler = async (req, res) => {
  const data = loginSchema.parse(req.body);
  const result = await auth.login(data.email, data.password);
  res
    .cookie(cookieName, result.token, { ...cookieOptions, maxAge: env.SESSION_DAYS * 86400000 })
    .json({ success: true, data: result.user });
};
export const logout: RequestHandler = async (req, res) => {
  const token = req.cookies[cookieName];
  if (typeof token === 'string') {
    const session = await auth.resolveSession(token);
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    if (session) disconnectSessions(session.userId, session.id);
  }
  res.clearCookie(cookieName, cookieOptions).json({ success: true, data: null });
};
export const me: RequestHandler = (_req, res) => {
  res.json({ success: true, data: res.locals.user });
};
export const forgot: RequestHandler = async (req, res) => {
  const { email } = z.object({ email: emailSchema }).parse(req.body);
  await auth.requestToken(email, 'RESET');
  res.json({
    success: true,
    data: { message: 'If this account exists, a reset link has been sent.' },
  });
};
export const reset: RequestHandler = async (req, res) => {
  const data = z.object({ token: tokenSchema, password: passwordSchema }).parse(req.body);
  await auth.redeemToken(data.token, 'RESET', data.password);
  res.clearCookie(cookieName, cookieOptions).json({ success: true, data: null });
};
export const verify: RequestHandler = async (req, res) => {
  const { token } = z.object({ token: tokenSchema }).parse(req.body);
  await auth.redeemToken(token, 'VERIFY');
  res.json({ success: true, data: null });
};
export const resend = endpoint(requestSchema(), async (_, userId) => {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  await auth.requestToken(user.email, 'VERIFY');
});
export const profile = endpoint(
  requestSchema(
    z.object({
      name: z.string().trim().min(2).max(80),
      email: emailSchema,
      bio: z.string().max(500).optional(),
      avatar: z
        .string()
        .url()
        .max(2000)
        .refine((url) => url.startsWith('https://'), 'Avatar must use HTTPS')
        .nullable()
        .optional(),
      emailNotifications: z.boolean(),
    }),
  ),
  (input, userId) => auth.updateProfile(userId, input.body),
);
export const password = endpoint(
  requestSchema(
    z.object({ currentPassword: z.string().min(1).max(200), password: passwordSchema }),
  ),
  (input, userId) => auth.changePassword(userId, input.body.currentPassword, input.body.password),
);
