import { sendMail } from './mail.service.js';
import { env } from '../config/env.js';
import { db, publicUserSelect } from '../config/db.js';
import type { NotificationType, Prisma } from '@prisma/client';
import type { Server } from 'socket.io';
let io: Server | undefined;
export const bindEvents = (server: Server) => {
  io = server;
};
export function projectChanged(projectId: string, workspaceId: string) {
  io?.to(`project:${projectId}`)
    .to(`workspace:${workspaceId}`)
    .emit('data:changed', { projectId, workspaceId });
}
export function workspaceChanged(workspaceId: string) {
  io?.to(`workspace:${workspaceId}`).emit('data:changed', { workspaceId });
}
export function revokeWorkspace(userId: string, workspaceId: string, projectIds: string[]) {
  const sockets = io?.sockets.adapter.rooms.get(`user:${userId}`);
  for (const id of sockets ?? []) {
    const socket = io?.sockets.sockets.get(id);
    socket?.leave(`workspace:${workspaceId}`);
    for (const projectId of projectIds) socket?.leave(`project:${projectId}`);
    socket?.emit('access:changed');
  }
}
export async function activity(
  actorId: string,
  workspaceId: string,
  action: string,
  entity: string,
  entityId: string,
  title: string,
  projectId?: string,
) {
  await db.activityLog.create({
    data: { actorId, workspaceId, projectId, action, entity, entityId, metadata: { title } },
  });
}
export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  href: string,
  dedupeKey?: string,
) {
  const data = { userId, type, title, body, href, dedupeKey };
  const existed = dedupeKey
    ? await db.notification.findUnique({ where: { dedupeKey }, select: { id: true } })
    : null;
  const notification = dedupeKey
    ? await db.notification.upsert({ where: { dedupeKey }, create: data, update: {} })
    : await db.notification.create({ data });
  if (!existed) {
    io?.to(`user:${userId}`).emit('notification', notification);
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, emailNotifications: true, emailVerified: true },
    });
    if (user?.emailNotifications && user.emailVerified && type !== 'WORKSPACE_INVITATION')
      await sendMail(user.email, title, `${body}\n\n${env.CLIENT_URL}${href}`);
  }
  return notification;
}
export async function activityList(
  where: Prisma.ActivityLogWhereInput,
  page: number,
  limit: number,
) {
  const [items, total] = await db.$transaction([
    db.activityLog.findMany({
      where,
      include: { actor: { select: publicUserSelect } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.activityLog.count({ where }),
  ]);
  return { items, total, page, limit };
}

export function disconnectSessions(userId: string, sessionId?: string) {
  for (const socket of io?.sockets.sockets.values() ?? [])
    if (socket.data.user?.id === userId && (!sessionId || socket.data.sessionId === sessionId))
      socket.disconnect(true);
}

export function accessChanged(userId: string) {
  io?.to(`user:${userId}`).emit('access:changed');
}
