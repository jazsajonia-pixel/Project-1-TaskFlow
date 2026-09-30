import { db } from '../config/db.js';
import { AppError, assertFound } from '../utils/errors.js';
import type { Role } from '@prisma/client';
export type Capability = 'read' | 'write' | 'manage' | 'owner';
const permissions: Record<Capability, Role[]> = {
  read: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'],
  write: ['OWNER', 'ADMIN', 'MEMBER'],
  manage: ['OWNER', 'ADMIN'],
  owner: ['OWNER'],
};
export async function workspaceAccess(
  userId: string,
  workspaceId: string,
  capability: Capability = 'read',
) {
  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) throw new AppError(404, 'Workspace not found');
  if (!permissions[capability].includes(member.role))
    throw new AppError(403, 'Your workspace role does not permit this action');
  return member;
}
export async function projectAccess(
  userId: string,
  projectId: string,
  capability: Capability = 'read',
) {
  const project = assertFound(
    await db.project.findUnique({ where: { id: projectId } }),
    'Project not found',
  );
  await workspaceAccess(userId, project.workspaceId, capability);
  return project;
}
export async function taskAccess(userId: string, taskId: string, capability: Capability = 'read') {
  const task = assertFound(await db.task.findUnique({ where: { id: taskId } }), 'Task not found');
  const project = await projectAccess(userId, task.projectId, capability);
  return { task, project };
}
