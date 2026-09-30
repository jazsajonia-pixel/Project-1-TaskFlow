import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import * as c from '../controllers/auth.controller.js';
import {
  registerSchema,
  loginSchema,
  emailSchema,
  passwordSchema,
  tokenSchema,
} from '../../../shared/validation.js';
import { route } from './register.js';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
});
const options = { public: true, middleware: [limiter] };
route('post', '/auth/register', c.register, 'Authentication', 'Create an account', {
  ...options,
  body: registerSchema,
});
route(
  'post',
  '/auth/login',
  c.login,
  'Authentication',
  'Sign in with an HTTP-only session cookie',
  { ...options, body: loginSchema },
);
route('post', '/auth/logout', c.logout, 'Authentication', 'Revoke the current session', {
  public: true,
});
route('get', '/auth/me', c.me, 'Authentication', 'Get the authenticated profile');
route('post', '/auth/forgot-password', c.forgot, 'Authentication', 'Send a password reset link', {
  ...options,
  body: z.object({ email: emailSchema }),
});
route(
  'post',
  '/auth/reset-password',
  c.reset,
  'Authentication',
  'Redeem a one-time password reset link',
  { ...options, body: z.object({ token: tokenSchema, password: passwordSchema }) },
);
route('post', '/auth/verify-email', c.verify, 'Authentication', 'Verify an email address', {
  ...options,
  body: z.object({ token: tokenSchema }),
});
route(
  'post',
  '/auth/resend-verification',
  c.resend,
  'Authentication',
  'Send another verification email',
  { middleware: [limiter] },
);
route('patch', '/profile', c.profile, 'Profile', 'Update profile and notification preferences');
route(
  'post',
  '/profile/password',
  c.password,
  'Profile',
  'Change password and revoke all sessions',
  { middleware: [limiter] },
);
