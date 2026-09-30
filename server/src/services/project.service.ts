import { enqueueFiles } from './cleanup.service.js';
import { db, publicUserSelect } from '../config/db.js';
import { workspaceAccess, projectAccess } from './access.service.js';
import { activity, projectChanged, notify } from './events.service.js';
import type { z } from 'zod';
import type { projectSchema } from '../../../shared/validation.js';
import { AppError } from '../utils/errors.js';
export async function listProjects(
  userId: string,
  workspaceId: string | undefined,
  page: number,
  limit: number,
) {
  if (workspaceId) await workspaceAccess(userId, workspaceId);
  const where = {
    ...(workspaceId ? { workspaceId } : {}),
    workspace: { members: { some: { userId } } },
  };
  const [items, total] = await db.$transaction([
    db.project.findMany({
      where,
      include: {
        _count: { select: { tasks: true } },
        members: { take: 6, include: { user: { select: publicUserSelect } } },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.project.count({ where }),
  ]);
  const completed = await db.task.groupBy({
    by: ['projectId'],
    where: { projectId: { in: items.map((p) => p.id) }, status: 'DONE' },
    _count: { _all: true },
  });
  const counts = new Map(completed.map((c) => [c.projectId, c._count._all]));
  const projects = items.map((p) => ({ ...p, completedTasks: counts.get(p.id) ?? 0 }));
  return { items: projects, total, page, limit };
}
export async function createProject(userId: string, input: z.infer<typeof projectSchema>) {
  await workspaceAccess(userId, input.workspaceId, 'manage');
  if (input.startDate && input.dueDate && new Date(input.startDate) > new Date(input.dueDate))
    throw new AppError(422, 'Due date must follow start date');
  const project = await db.project.create({
    data: { ...input, createdBy: userId, members: { create: { userId } } },
  });
  await activity(
    userId,
    project.workspaceId,
    'created project',
    'project',
    project.id,
    project.name,
    project.id,
  );
  projectChanged(project.id, project.workspaceId);
  return project;
}
export async function getProject(userId: string, id: string) {
  await projectAccess(userId, id);
  return db.project.findUniqueOrThrow({
    where: { id },
    include: {
      labels: true,
      members: { include: { user: { select: publicUserSelect } } },
      _count: { select: { tasks: true } },
    },
  });
}
export async function updateProject(
  userId: string,
  id: string,
  input: Partial<Omit<z.infer<typeof projectSchema>, 'workspaceId'>>,
) {
  const previous = await projectAccess(userId, id, 'manage');
  const start = input.startDate === undefined ? previous.startDate : input.startDate;
  const due = input.dueDate === undefined ? previous.dueDate : input.dueDate;
  if (start && due && new Date(start) > new Date(due))
    throw new AppError(422, 'Due date must follow start date');
  const project = await db.project.update({ where: { id }, data: input });
  await activity(userId, previous.workspaceId, 'updated project', 'project', id, project.name, id);
  projectChanged(id, previous.workspaceId);
  return project;
}
export async function deleteProject(userId: string, id: string) {
  const project = await projectAccess(userId, id, 'manage');
  await db.$transaction(async (tx) => {
    await enqueueFiles(tx, { task: { projectId: id } });
    await tx.project.delete({ where: { id } });
  });
  await activity(userId, project.workspaceId, 'deleted project', 'project', id, project.name);
  projectChanged(id, project.workspaceId);
}
export async function projectMember(
  userId: string,
  id: string,
  targetUserId: string,
  remove = false,
) {
  const project = await projectAccess(userId, id, 'manage');
  await workspaceAccess(targetUserId, project.workspaceId);
  if (remove) await db.projectMember.deleteMany({ where: { projectId: id, userId: targetUserId } });
  else {
    await db.projectMember.upsert({
      where: { projectId_userId: { projectId: id, userId: targetUserId } },
      create: { projectId: id, userId: targetUserId },
      update: {},
    });
    if (userId !== targetUserId)
      await notify(
        targetUserId,
        'PROJECT_INVITATION',
        `You joined ${project.name}`,
        'You have been added to the project team.',
        `/app/projects/${id}`,
      );
  }
  projectChanged(id, project.workspaceId);
}
export async function createLabel(
  userId: string,
  id: string,
  input: { name: string; color: string },
) {
  const project = await projectAccess(userId, id, 'write');
  const label = await db.label.create({ data: { ...input, projectId: id } });
  projectChanged(id, project.workspaceId);
  return label;
}
export async function deleteLabel(userId: string, id: string, labelId: string) {
  const project = await projectAccess(userId, id, 'write');
  await db.label.deleteMany({ where: { id: labelId, projectId: id } });
  projectChanged(id, project.workspaceId);
}
