import { accessChanged } from './events.service.js';
import { enqueueFiles } from './cleanup.service.js';
import type { Role } from '@prisma/client';
import { db, publicUserSelect } from '../config/db.js';
import { env } from '../config/env.js';
import { workspaceAccess } from './access.service.js';
import { activity, notify, revokeWorkspace, workspaceChanged } from './events.service.js';
import { newToken, hashToken } from '../utils/tokens.js';
import { AppError, assertFound } from '../utils/errors.js';
import { sendMail } from './mail.service.js';
export const listWorkspaces = (userId: string) =>
  db.workspace.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: { where: { userId }, select: { role: true } },
      _count: { select: { members: true, projects: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });
export async function createWorkspace(
  userId: string,
  input: { name: string; description?: string },
) {
  const workspace = await db.workspace.create({
    data: { ...input, ownerId: userId, members: { create: { userId, role: 'OWNER' } } },
  });
  await activity(
    userId,
    workspace.id,
    'created workspace',
    'workspace',
    workspace.id,
    workspace.name,
  );
  return workspace;
}
export async function getWorkspace(userId: string, id: string) {
  await workspaceAccess(userId, id);
  return db.workspace.findUniqueOrThrow({
    where: { id },
    include: { _count: { select: { members: true, projects: true } } },
  });
}
export async function updateWorkspace(
  userId: string,
  id: string,
  input: { name?: string; description?: string },
) {
  await workspaceAccess(userId, id, 'manage');
  const updated = await db.workspace.update({ where: { id }, data: input });
  workspaceChanged(id);
  return updated;
}
export async function deleteWorkspace(userId: string, id: string) {
  await workspaceAccess(userId, id, 'owner');
  const members = await db.workspaceMember.findMany({ where: { workspaceId: id } });
  const projects = await db.project.findMany({ where: { workspaceId: id }, select: { id: true } });
  await db.$transaction(async (tx) => {
    await enqueueFiles(tx, { task: { project: { workspaceId: id } } });
    await tx.workspace.delete({ where: { id } });
  });
  for (const member of members)
    revokeWorkspace(
      member.userId,
      id,
      projects.map((p) => p.id),
    );
}
export async function listMembers(userId: string, id: string, page: number, limit: number) {
  await workspaceAccess(userId, id);
  const where = { workspaceId: id };
  const [items, total] = await db.$transaction([
    db.workspaceMember.findMany({
      where,
      include: { user: { select: { ...publicUserSelect, email: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'asc' },
    }),
    db.workspaceMember.count({ where }),
  ]);
  return { items, total, page, limit };
}
export async function changeMember(
  userId: string,
  id: string,
  memberId: string,
  role?: Exclude<Role, 'OWNER'>,
) {
  const actor = await workspaceAccess(userId, id, 'manage');
  const target = assertFound(
    await db.workspaceMember.findFirst({ where: { id: memberId, workspaceId: id } }),
  );
  if (
    target.role === 'OWNER' ||
    (actor.role === 'ADMIN' && (target.role === 'ADMIN' || role === 'ADMIN'))
  )
    throw new AppError(
      403,
      'Only the owner can manage administrators; ownership cannot be removed',
    );
  if (role) await db.workspaceMember.update({ where: { id: memberId }, data: { role } });
  else
    await db.$transaction(async (tx) => {
      await tx.taskAssignee.deleteMany({
        where: { userId: target.userId, task: { project: { workspaceId: id } } },
      });
      await tx.projectMember.deleteMany({
        where: { userId: target.userId, project: { workspaceId: id } },
      });
      await tx.workspaceMember.delete({ where: { id: memberId } });
    });
  const projects = await db.project.findMany({ where: { workspaceId: id }, select: { id: true } });
  if (role) accessChanged(target.userId);
  else
    revokeWorkspace(
      target.userId,
      id,
      projects.map((p) => p.id),
    );
  await activity(
    userId,
    id,
    role ? 'changed member role' : 'removed member',
    'member',
    memberId,
    role ?? 'Workspace member',
  );
  workspaceChanged(id);
}
export async function invite(
  userId: string,
  id: string,
  email: string,
  role: Exclude<Role, 'OWNER'>,
) {
  const actor = await workspaceAccess(userId, id, 'manage');
  if (role === 'ADMIN' && actor.role !== 'OWNER')
    throw new AppError(403, 'Only the owner can invite administrators');
  const workspace = await db.workspace.findUniqueOrThrow({ where: { id } });
  const existing = await db.user.findUnique({ where: { email } });
  if (
    existing &&
    (await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId: existing.id } },
    }))
  )
    throw new AppError(409, 'This person is already a member');
  const token = newToken();
  const invitation = await db.$transaction(async (tx) => {
    await tx.workspaceInvitation.updateMany({
      where: { workspaceId: id, email, status: 'PENDING' },
      data: { status: 'REVOKED' },
    });
    return tx.workspaceInvitation.create({
      data: {
        workspaceId: id,
        email,
        role,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
      select: { id: true, email: true, role: true, status: true, expiresAt: true },
    });
  });
  const href = `/invitations/${token}`;
  await sendMail(email, `Join ${workspace.name} on TaskFlow`, `${env.CLIENT_URL}${href}`);
  if (existing)
    await notify(
      existing.id,
      'WORKSPACE_INVITATION',
      `You're invited to ${workspace.name}`,
      'Join your team and start collaborating.',
      href,
    );
  await activity(userId, id, 'invited member', 'invitation', invitation.id, email);
  return { ...invitation, inviteUrl: `${env.CLIENT_URL}${href}` };
}
export async function invitations(userId: string, id: string) {
  await workspaceAccess(userId, id, 'manage');
  await db.workspaceInvitation.updateMany({
    where: { workspaceId: id, status: 'PENDING', expiresAt: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  });
  return db.workspaceInvitation.findMany({
    where: { workspaceId: id },
    select: { id: true, email: true, role: true, status: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}
export async function revokeInvitation(userId: string, id: string, invitationId: string) {
  const actor = await workspaceAccess(userId, id, 'manage');
  const invitation = await db.workspaceInvitation.findFirst({
    where: { id: invitationId, workspaceId: id },
  });
  if (invitation?.role === 'ADMIN' && actor.role !== 'OWNER')
    throw new AppError(403, 'Only the owner can revoke administrator invitations');
  await db.workspaceInvitation.updateMany({
    where: { id: invitationId, workspaceId: id, status: 'PENDING' },
    data: { status: 'REVOKED' },
  });
}
export async function acceptInvitation(userId: string, token: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.emailVerified)
    throw new AppError(403, 'Verify your email before accepting an invitation');
  const invitation = assertFound(
    await db.workspaceInvitation.findUnique({ where: { tokenHash: hashToken(token) } }),
    'Invitation not found',
  );
  if (invitation.email !== user.email)
    throw new AppError(403, 'Sign in with the invited email address');
  if (invitation.status !== 'PENDING' || invitation.expiresAt < new Date())
    throw new AppError(400, 'This invitation has expired or is no longer available');
  await db.$transaction(async (tx) => {
    const consumed = await tx.workspaceInvitation.updateMany({
      where: { id: invitation.id, status: 'PENDING', expiresAt: { gt: new Date() } },
      data: { status: 'ACCEPTED' },
    });
    if (consumed.count !== 1) throw new AppError(409, 'Invitation already accepted');
    await tx.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } },
      create: { workspaceId: invitation.workspaceId, userId, role: invitation.role },
      update: {},
    });
  });
  await activity(userId, invitation.workspaceId, 'joined workspace', 'member', userId, user.name);
  workspaceChanged(invitation.workspaceId);
  return { workspaceId: invitation.workspaceId };
}
