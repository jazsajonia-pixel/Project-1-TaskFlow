import { enqueueFiles } from './cleanup.service.js';
import { fileTypeFromBuffer } from 'file-type';
import { db } from '../config/db.js';
import { env } from '../config/env.js';
import { taskAccess, projectAccess } from './access.service.js';
import { storage } from './storage.service.js';
import { activity, projectChanged } from './events.service.js';
import { AppError, assertFound } from '../utils/errors.js';
const allowed = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
export async function uploadAttachment(userId: string, taskId: string, file?: Express.Multer.File) {
  const { task, project } = await taskAccess(userId, taskId, 'write');
  if (!file || !file.size || file.size > 10 * 1024 * 1024)
    throw new AppError(422, 'Choose a file up to 10 MB');
  const detected = await fileTypeFromBuffer(file.buffer);
  if (!detected || !allowed.has(detected.mime))
    throw new AppError(422, 'Supported files: PDF, DOCX, PNG, JPG, and WebP');
  if ((await db.attachment.count({ where: { taskId } })) >= 100)
    throw new AppError(422, 'A task can have at most 100 attachments');
  const provider = storage();
  const object = await provider.put(file.buffer, detected.mime);
  let attachment;
  try {
    attachment = await db.attachment.create({
      data: {
        taskId,
        uploadedBy: userId,
        originalFilename: Array.from(file.originalname)
          .map((char) =>
            char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 || char === '/' || char === '\\'
              ? '_'
              : char,
          )
          .join('')
          .slice(0, 255),
        storageKey: object.key,
        url: object.url,
        provider: env.STORAGE_PROVIDER,
        mimeType: detected.mime,
        size: file.size,
      },
    });
  } catch (error) {
    await provider.remove(object.key);
    throw error;
  }
  await activity(
    userId,
    project.workspaceId,
    'attached a file to',
    'task',
    taskId,
    task.title,
    project.id,
  );
  projectChanged(project.id, project.workspaceId);
  return attachment;
}
export async function downloadAttachment(userId: string, id: string) {
  const attachment = assertFound(await db.attachment.findUnique({ where: { id } }));
  await taskAccess(userId, attachment.taskId);
  return {
    attachment,
    data: await storage(envProvider(attachment.provider)).get(attachment.storageKey),
  };
}
function envProvider(provider: string) {
  if (provider === 'local' || provider === 's3' || provider === 'r2' || provider === 'cloudinary')
    return provider;
  throw new Error('Unsupported storage provider');
}
export async function deleteAttachment(userId: string, id: string) {
  const attachment = assertFound(await db.attachment.findUnique({ where: { id } }));
  const { project } = await taskAccess(userId, attachment.taskId, 'write');
  await db.$transaction(async (tx) => {
    await enqueueFiles(tx, { id });
    await tx.attachment.delete({ where: { id } });
  });
  projectChanged(project.id, project.workspaceId);
}
export async function projectFiles(userId: string, projectId: string, page: number, limit: number) {
  await projectAccess(userId, projectId);
  const where = { task: { projectId } };
  const [items, total] = await db.$transaction([
    db.attachment.findMany({
      where,
      include: { task: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.attachment.count({ where }),
  ]);
  return { items, total, page, limit };
}
