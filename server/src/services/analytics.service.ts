import type { Prisma } from '@prisma/client';
import { db, publicUserSelect } from '../config/db.js';
import { workspaceAccess, projectAccess } from './access.service.js';
export async function analytics(userId: string, workspaceId?: string, projectId?: string) {
  if (workspaceId) await workspaceAccess(userId, workspaceId);
  if (projectId) await projectAccess(userId, projectId);
  const scope: Prisma.ProjectWhereInput = {
    workspace: { members: { some: { userId } } },
    ...(workspaceId && { workspaceId }),
    ...(projectId && { id: projectId }),
  };
  const where: Prisma.TaskWhereInput = { project: scope };
  const now = new Date();
  const [total, completed, overdue, projects, byStatus, byPriority, assigned, deadlines, activity] =
    await Promise.all([
      db.task.count({ where }),
      db.task.count({ where: { ...where, status: 'DONE' } }),
      db.task.count({ where: { ...where, status: { not: 'DONE' }, dueDate: { lt: now } } }),
      db.project.count({ where: scope }),
      db.task.groupBy({ by: ['status'], where, _count: { _all: true } }),
      db.task.groupBy({ by: ['priority'], where, _count: { _all: true } }),
      db.task.findMany({
        where: { ...where, assignees: { some: { userId } }, status: { not: 'DONE' } },
        include: { project: { select: { id: true, name: true, color: true } } },
        orderBy: { dueDate: 'asc' },
        take: 6,
      }),
      db.task.findMany({
        where: {
          ...where,
          status: { not: 'DONE' },
          dueDate: { gte: now, lte: new Date(now.getTime() + 14 * 86400000) },
        },
        include: { project: { select: { id: true, name: true, color: true } } },
        orderBy: { dueDate: 'asc' },
        take: 6,
      }),
      db.activityLog.findMany({
        where: {
          workspace: { members: { some: { userId } } },
          ...(workspaceId && { workspaceId }),
          ...(projectId && { projectId }),
        },
        include: { actor: { select: publicUserSelect } },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ]);
  const timeline = await Promise.all(
    Array.from({ length: 7 }, async (_, index) => {
      const start = new Date(now);
      start.setUTCHours(0, 0, 0, 0);
      start.setUTCDate(start.getUTCDate() - (6 - index));
      const end = new Date(start.getTime() + 86400000);
      const [created, done] = await Promise.all([
        db.task.count({ where: { ...where, createdAt: { gte: start, lt: end } } }),
        db.task.count({ where: { ...where, completedAt: { gte: start, lt: end } } }),
      ]);
      return {
        date: start.toISOString(),
        day: start.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
        created,
        completed: done,
      };
    }),
  );
  return {
    total,
    completed,
    open: total - completed,
    overdue,
    projects,
    completion: total ? Math.round((completed / total) * 100) : 0,
    byStatus: byStatus.map((s) => ({ name: s.status, value: s._count._all })),
    byPriority: byPriority.map((s) => ({ name: s.priority, value: s._count._all })),
    assigned,
    deadlines,
    activity,
    timeline,
  };
}
export async function search(userId: string, q: string) {
  const membership = { members: { some: { userId } } };
  const [workspaces, projects, tasks, users] = await Promise.all([
    db.workspace.findMany({
      where: { ...membership, name: { contains: q } },
      select: { id: true, name: true },
      take: 8,
    }),
    db.project.findMany({
      where: { workspace: membership, name: { contains: q } },
      select: { id: true, name: true, workspaceId: true },
      take: 8,
    }),
    db.task.findMany({
      where: { project: { workspace: membership }, title: { contains: q } },
      select: { id: true, title: true, projectId: true },
      take: 12,
    }),
    db.user.findMany({
      where: { name: { contains: q }, memberships: { some: { workspace: membership } } },
      select: publicUserSelect,
      take: 8,
    }),
  ]);
  return { workspaces, projects, tasks, users };
}
