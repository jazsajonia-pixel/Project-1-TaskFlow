import nodemailer from 'nodemailer';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { env } from '../config/env.js';
import { db } from '../config/db.js';
// A durable outbox prevents a provider failure from undoing a successful user action.
export async function sendMail(to: string, subject: string, text: string) {
  await db.mailJob.create({ data: { to, subject, body: text } });
}
export async function deliverMail() {
  const jobs = await db.mailJob.findMany({
    where: { nextAttemptAt: { lte: new Date() }, attempts: { lt: 10 } },
    orderBy: { createdAt: 'asc' },
    take: 25,
  });
  const transport = env.SMTP_HOST
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
      })
    : undefined;
  for (const job of jobs) {
    // Lease before sending; after a crash this becomes available again in five minutes.
    const lease = await db.mailJob.updateMany({
      where: { id: job.id, nextAttemptAt: { lte: new Date() }, attempts: job.attempts },
      data: { nextAttemptAt: new Date(Date.now() + 300000) },
    });
    if (!lease.count) continue;
    try {
      if (transport)
        await transport.sendMail({
          from: env.MAIL_FROM,
          to: job.to,
          subject: job.subject,
          text: job.body,
        });
      else {
        const directory = resolve(env.UPLOAD_DIR, '.mail');
        await mkdir(directory, { recursive: true, mode: 0o700 });
        await writeFile(
          resolve(directory, `${job.id}.json`),
          JSON.stringify({ to: job.to, subject: job.subject, text: job.body }),
          { mode: 0o600 },
        );
      }
      await db.mailJob.delete({ where: { id: job.id } });
    } catch {
      await db.mailJob.update({
        where: { id: job.id },
        data: {
          attempts: { increment: 1 },
          nextAttemptAt: new Date(Date.now() + Math.min(86400000, 60000 * 2 ** job.attempts)),
        },
      });
      console.error('Email delivery failed; queued for retry');
    }
  }
}
