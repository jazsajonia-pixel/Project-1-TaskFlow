import { enqueueFiles } from './cleanup.service.js';
import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { db, publicUserSelect } from '../config/db.js';
import { taskAccess, projectAccess } from './access.service.js';
import { activity, projectChanged, notify } from './events.service.js';
import { AppError } from '../utils/errors.js';
import type { taskSchema, taskPatchSchema } from '../../../shared/validation.js';
export const taskInclude = {
  assignees: { include: { user: { select: publicUserSelect } } },
  labels: { include: { label: true } },
  subtasks: { orderBy: { createdAt: 'asc' as const } },
  _count: { select: { comments: true, attachments: true } },
} satisfies Prisma.TaskInclude;
export async function listTasks(
  userId: string,
  options: {
    projectId?: string;
    assigned?: boolean;
    status?: Prisma.TaskWhereInput['status'];
    priority?: Prisma.TaskWhereInput['priority'];
    q?: string;
    page: number;
    limit: number;
  },
) {
  if (options.projectId) await projectAccess(userId, options.projectId);
  const where: Prisma.TaskWhereInput = {
    project: { workspace: { members: { some: { userId } } } },
    ...(options.projectId && { projectId: options.projectId }),
    ...(options.assigned && { assignees: { some: { userId } } }),
    ...(options.status && { status: options.status }),
    ...(options.priority && { priority: options.priority }),
    ...(options.q && { title: { contains: options.q } }),
  };
  const [items, total] = await db.$transaction([
    db.task.findMany({
      where,
      include: {
        ...taskInclude,
        project: { select: { id: true, name: true, color: true, workspaceId: true } },
      },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    }),
    db.task.count({ where }),
  ]);
  return { items, total, page: options.page, limit: options.limit };
}
async function validateRelations(
  workspaceId: string,
  projectId: string,
  assigneeIds?: string[],
  labelIds?: string[],
) {
  if (
    assigneeIds &&
    (await db.workspaceMember.count({
      where: { workspaceId, userId: { in: [...new Set(assigneeIds)] } },
    })) !== new Set(assigneeIds).size
  )
    throw new AppError(422, 'Assignees must belong to this workspace');
  if (
    labelIds &&
    (await db.label.count({ where: { projectId, id: { in: [...new Set(labelIds)] } } })) !==
      new Set(labelIds).size
  )
    throw new AppError(422, 'Labels must belong to this project');
}
export async function createTask(
  userId: string,
  projectId: string,
  input: z.infer<typeof taskSchema>,
) {
  const project = await projectAccess(userId, projectId, 'write');
  await validateRelations(project.workspaceId, projectId, input.assigneeIds, input.labelIds);
  const { assigneeIds, labelIds, ...fields } = input;
  const task = await db.$transaction(async (tx) => {
    await tx.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
    const last = await tx.task.aggregate({
      where: { projectId, status: input.status },
      _max: { position: true },
    });
    return tx.task.create({
      data: {
        ...fields,
        projectId,
        createdBy: userId,
        position: (last._max.position ?? 0) + 1024,
        completedAt: input.status === 'DONE' ? new Date() : null,
        assignees: { create: [...new Set(assigneeIds)].map((userId) => ({ userId })) },
        labels: { create: [...new Set(labelIds)].map((labelId) => ({ labelId })) },
      },
      include: taskInclude,
    });
  });
  await activity(
    userId,
    project.workspaceId,
    'created task',
    'task',
    task.id,
    task.title,
    projectId,
  );
  for (const id of new Set(assigneeIds))
    if (id !== userId)
      await notify(
        id,
        'TASK_ASSIGNED',
        'A new task for you',
        task.title,
        `/app/projects/${projectId}?task=${task.id}`,
      );
  projectChanged(projectId, project.workspaceId);
  return task;
}
export async function getTask(userId: string, id: string) {
  const { project } = await taskAccess(userId, id);
  const task = await db.task.findUniqueOrThrow({
    where: { id },
    include: {
      ...taskInclude,
      attachments: {
        include: { uploader: { select: publicUserSelect } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      },
    },
  });
  return { ...task, project };
}
export async function updateTask(
  userId: string,
  id: string,
  input: z.infer<typeof taskPatchSchema>,
) {
  const { task, project } = await taskAccess(userId, id, 'write');
  await validateRelations(project.workspaceId, project.id, input.assigneeIds, input.labelIds);
  const { assigneeIds, labelIds, version, ...fields } = input;
  const previousAssignees = await db.taskAssignee.findMany({ where: { taskId: id } });
  const updated = await db.$transaction(async (tx) => {
    const result = await tx.task.updateMany({
      where: { id, version },
      data: {
        ...fields,
        version: { increment: 1 },
        ...(input.status
          ? { completedAt: input.status === 'DONE' ? (task.completedAt ?? new Date()) : null }
          : {}),
      },
    });
    if (!result.count) throw new AppError(409, 'This task changed. Refresh and try again.');
    if (assigneeIds) {
      await tx.taskAssignee.deleteMany({ where: { taskId: id } });
      if (assigneeIds.length)
        await tx.taskAssignee.createMany({
          data: [...new Set(assigneeIds)].map((userId) => ({ taskId: id, userId })),
        });
    }
    if (labelIds) {
      await tx.taskLabel.deleteMany({ where: { taskId: id } });
      if (labelIds.length)
        await tx.taskLabel.createMany({
          data: [...new Set(labelIds)].map((labelId) => ({ taskId: id, labelId })),
        });
    }
    return tx.task.findUniqueOrThrow({ where: { id }, include: taskInclude });
  });
  for (const assigneeId of new Set(assigneeIds ?? []))
    if (assigneeId !== userId && !previousAssignees.some((a) => a.userId === assigneeId))
      await notify(
        assigneeId,
        'TASK_ASSIGNED',
        'You were assigned a task',
        updated.title,
        `/app/projects/${project.id}?task=${id}`,
      );
  await activity(
    userId,
    project.workspaceId,
    input.status && input.status !== task.status
      ? `moved task to ${input.status.toLowerCase().replaceAll('_', ' ')}`
      : 'updated task',
    'task',
    id,
    updated.title,
    project.id,
  );
  projectChanged(project.id, project.workspaceId);
  return updated;
}
export async function deleteTask(userId: string, id: string) {
  const { task, project } = await taskAccess(userId, id, 'write');
  await db.$transaction(async (tx) => {
    await enqueueFiles(tx, { taskId: id });
    await tx.task.delete({ where: { id } });
  });
  await activity(userId, project.workspaceId, 'deleted task', 'task', id, task.title, project.id);
  projectChanged(project.id, project.workspaceId);
}
export async function createSubtask(userId: string, id: string, title: string) {
  const { project } = await taskAccess(userId, id, 'write');
  const subtask = await db.subtask.create({ data: { taskId: id, title } });
  projectChanged(project.id, project.workspaceId);
  return subtask;
}
export async function updateSubtask(
  userId: string,
  id: string,
  subtaskId: string,
  data?: { title?: string; completed?: boolean },
) {
  const { project } = await taskAccess(userId, id, 'write');
  const where = { id: subtaskId, taskId: id };
  const result = data
    ? await db.subtask.updateMany({ where, data })
    : await db.subtask.deleteMany({ where });
  if (!result.count) throw new AppError(404, 'Subtask not found');
  projectChanged(project.id, project.workspaceId);
}
