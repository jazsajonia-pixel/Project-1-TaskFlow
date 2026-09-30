import { db, publicUserSelect } from '../config/db.js';
import { taskAccess } from './access.service.js';
import { notify, activity, projectChanged } from './events.service.js';
import { AppError, assertFound } from '../utils/errors.js';
export async function listComments(userId: string, taskId: string, page: number, limit: number) {
  await taskAccess(userId, taskId);
  const where = { taskId };
  const [items, total] = await db.$transaction([
    db.comment.findMany({
      where,
      include: { user: { select: publicUserSelect } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.comment.count({ where }),
  ]);
  return { items, total, page, limit };
}
export async function createComment(userId: string, taskId: string, body: string) {
  const { task, project } = await taskAccess(userId, taskId, 'write');
  const comment = await db.comment.create({
    data: { taskId, userId, body },
    include: { user: { select: publicUserSelect } },
  });
  const mentionEmails = [...body.matchAll(/@([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi)].map(
    (match) => match[1].toLowerCase(),
  );
  const mentioned = await db.workspaceMember.findMany({
    where: {
      workspaceId: project.workspaceId,
      user: { email: { in: mentionEmails } },
      userId: { not: userId },
    },
    select: { userId: true },
  });
  const href = `/app/projects/${project.id}?task=${taskId}`;
  for (const member of mentioned)
    await notify(
      member.userId,
      'TASK_MENTION',
      `${comment.user.name} mentioned you`,
      task.title,
      href,
    );
  const watchers = await db.taskAssignee.findMany({
    where: {
      taskId,
      userId: { notIn: [userId, ...mentioned.map((m) => m.userId)] },
      user: { memberships: { some: { workspaceId: project.workspaceId } } },
    },
  });
  for (const watcher of watchers)
    await notify(watcher.userId, 'COMMENT', `${comment.user.name} commented`, task.title, href);
  await activity(
    userId,
    project.workspaceId,
    'commented on task',
    'task',
    taskId,
    task.title,
    project.id,
  );
  projectChanged(project.id, project.workspaceId);
  return comment;
}
export async function editComment(
  userId: string,
  taskId: string,
  commentId: string,
  body?: string,
) {
  const { project } = await taskAccess(userId, taskId, 'write');
  const comment = assertFound(await db.comment.findFirst({ where: { id: commentId, taskId } }));
  if (comment.userId !== userId) throw new AppError(403, 'You can only change your own comments');
  if (body !== undefined) await db.comment.update({ where: { id: commentId }, data: { body } });
  else await db.comment.delete({ where: { id: commentId } });
  projectChanged(project.id, project.workspaceId);
}
