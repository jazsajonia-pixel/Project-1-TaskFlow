import { PrismaClient } from '@prisma/client';
export const db = new PrismaClient();
export const userSelect = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  bio: true,
  emailVerified: true,
  emailNotifications: true,
} as const;
export const publicUserSelect = { id: true, name: true, avatar: true } as const;
