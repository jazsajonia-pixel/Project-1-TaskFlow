import { disconnectSessions } from './events.service.js';
import bcrypt from 'bcryptjs';
import { db, userSelect } from '../config/db.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { newToken, hashToken } from '../utils/tokens.js';
import { sendMail } from './mail.service.js';
import type { z } from 'zod';
import type { registerSchema } from '../../../shared/validation.js';
const dummyHash = bcrypt.hashSync('timing-equalization-only', 12);
async function session(userId: string) {
  const token = newToken();
  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + env.SESSION_DAYS * 86400000),
    },
  });
  return token;
}
export async function requestToken(email: string, type: 'RESET' | 'VERIFY') {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || (type === 'VERIFY' && user.emailVerified)) return;
  const token = newToken();
  await db.$transaction([
    db.authToken.deleteMany({ where: { userId: user.id, type } }),
    db.authToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        type,
        expiresAt: new Date(Date.now() + (type === 'RESET' ? 3600000 : 86400000)),
      },
    }),
  ]);
  await sendMail(
    email,
    type === 'RESET' ? 'Reset your TaskFlow password' : 'Verify your TaskFlow email',
    `${env.CLIENT_URL}/${type === 'RESET' ? 'reset-password' : 'verify-email'}?token=${token}`,
  );
}
export async function register(input: z.infer<typeof registerSchema>) {
  if (await db.user.findUnique({ where: { email: input.email } }))
    throw new AppError(409, 'An account with this email already exists');
  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 12),
    },
    select: userSelect,
  });
  await requestToken(user.email, 'VERIFY');
  return { user, token: await session(user.id) };
}
export async function login(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);
  if (!user || !valid) throw new AppError(401, 'Email or password is incorrect');
  return {
    user: await db.user.findUniqueOrThrow({ where: { id: user.id }, select: userSelect }),
    token: await session(user.id),
  };
}
export async function resolveSession(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const found = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: userSelect } },
  });
  if (!found || found.expiresAt < new Date()) return null;
  return found;
}
export async function redeemToken(token: string, type: 'RESET' | 'VERIFY', password?: string) {
  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
  const changedUserId = await db.$transaction(async (tx) => {
    const found = await tx.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!found || found.type !== type || found.expiresAt < new Date())
      throw new AppError(400, 'This link has expired or has already been used');
    const consumed = await tx.authToken.deleteMany({ where: { id: found.id } });
    if (consumed.count !== 1) throw new AppError(400, 'This link has already been used');
    await tx.user.update({
      where: { id: found.userId },
      data: type === 'VERIFY' ? { emailVerified: true } : { passwordHash },
    });
    if (type === 'RESET') await tx.session.deleteMany({ where: { userId: found.userId } });
    return found.userId;
  });
  if (type === 'RESET') disconnectSessions(changedUserId);
}
export async function changePassword(userId: string, currentPassword: string, password: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash)))
    throw new AppError(400, 'Current password is incorrect');
  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(password, 12) },
    }),
    db.session.deleteMany({ where: { userId } }),
  ]);
  disconnectSessions(userId);
}
export async function updateProfile(
  userId: string,
  data: {
    name: string;
    email: string;
    bio?: string;
    avatar?: string | null;
    emailNotifications: boolean;
  },
) {
  const previous = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const changedEmail = previous.email !== data.email;
  const user = await db.user.update({
    where: { id: userId },
    data: { ...data, ...(changedEmail ? { emailVerified: false } : {}) },
    select: userSelect,
  });
  if (changedEmail) {
    await db.authToken.deleteMany({ where: { userId } });
    await requestToken(user.email, 'VERIFY');
  }
  return user;
}
