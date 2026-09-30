import type { Prisma } from '@prisma/client';
import { db } from '../config/db.js';
import { storage } from './storage.service.js';
export async function enqueueFiles(
  tx: Prisma.TransactionClient,
  where: Prisma.AttachmentWhereInput,
) {
  let cursor: string | undefined;
  do {
    const files = await tx.attachment.findMany({
      where,
      select: { id: true, provider: true, storageKey: true },
      orderBy: { id: 'asc' },
      take: 100,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (files.length)
      await tx.storageCleanup.createMany({
        data: files.map(({ provider, storageKey }) => ({ provider, storageKey })),
      });
    cursor = files.length === 100 ? files[files.length - 1].id : undefined;
  } while (cursor);
}
export async function cleanStorage() {
  const jobs = await db.storageCleanup.findMany({
    where: { nextAttemptAt: { lte: new Date() }, attempts: { lt: 10 } },
    orderBy: { createdAt: 'asc' },
    take: 25,
  });
  for (const job of jobs) {
    const lease = await db.storageCleanup.updateMany({
      where: { id: job.id, nextAttemptAt: { lte: new Date() }, attempts: job.attempts },
      data: { nextAttemptAt: new Date(Date.now() + 300000) },
    });
    if (!lease.count) continue;
    try {
      if (!['local', 's3', 'r2', 'cloudinary'].includes(job.provider))
        throw new Error('Unknown provider');
      await storage(job.provider as 'local' | 's3' | 'r2' | 'cloudinary').remove(job.storageKey);
      await db.storageCleanup.delete({ where: { id: job.id } });
    } catch {
      await db.storageCleanup.update({
        where: { id: job.id },
        data: {
          attempts: { increment: 1 },
          nextAttemptAt: new Date(Date.now() + Math.min(86400000, 60000 * 2 ** job.attempts)),
        },
      });
      console.error('Storage cleanup failed; queued for retry');
    }
  }
}
