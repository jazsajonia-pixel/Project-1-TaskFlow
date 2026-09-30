import { db } from '../config/db.js';
import { notify } from './events.service.js';
export async function listNotifications(userId: string, page: number, limit: number) {
  const where = { userId };
  const [items, total, unread] = await db.$transaction([
    db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.notification.count({ where }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { items, total, unread, page, limit };
}
export async function changeNotification(userId: string, id?: string, remove = false) {
  if (remove && id) await db.notification.deleteMany({ where: { id, userId } });
  else
    await db.notification.updateMany({
      where: { userId, ...(id && { id }), readAt: null },
      data: { readAt: new Date() },
    });
}
export async function deliverDeadlines() {
  let cursor: string | undefined;
  const now = new Date();
  do {
    const tasks = await db.task.findMany({
      where: {
        status: { not: 'DONE' },
        dueDate: { gte: now, lte: new Date(now.getTime() + 86400000) },
      },
      include: { assignees: { where: { user: { memberships: { some: {} } } } } },
      orderBy: { id: 'asc' },
      take: 100,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    for (const task of tasks)
      for (const a of task.assignees)
        await notify(
          a.userId,
          'DEADLINE',
          'A deadline is coming up',
          task.title,
          `/app/projects/${task.projectId}?task=${task.id}`,
          `deadline:${task.id}:${a.userId}:${task.dueDate!.toISOString()}`,
        );
    cursor = tasks.length === 100 ? tasks[tasks.length - 1].id : undefined;
  } while (cursor);
}
