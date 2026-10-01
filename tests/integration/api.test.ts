import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import bcrypt from 'bcryptjs';
import { app } from '../../server/src/app';
import { db } from '../../server/src/config/db';
import { setupSockets } from '../../server/src/sockets/index';
import { hashToken } from '../../server/src/utils/tokens';
import { cleanStorage } from '../../server/src/services/cleanup.service';
import { deliverMail } from '../../server/src/services/mail.service';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { env } from '../../server/src/config/env';
const origin = 'http://localhost:5173';
const password = 'synthetic-test-password-123';
const cookies: Record<string, string> = {};
const users: Record<string, string> = {};
let workspaceId: string, projectId: string, taskId: string, otherWorkspaceId: string;
const server = createServer(app);
const socketServer = setupSockets(server);
let socketUrl: string;
const sockets: Socket[] = [];
const auth = (role = 'owner') => request(app).get('/api/auth/me').set('Cookie', cookies[role]);
const post = (path: string, body: unknown, role = 'owner') =>
  request(app)
    .post(`/api${path}`)
    .set('Origin', origin)
    .set('Cookie', cookies[role] ?? '')
    .send(body);
const patch = (path: string, body: unknown, role = 'owner') =>
  request(app).patch(`/api${path}`).set('Origin', origin).set('Cookie', cookies[role]).send(body);
const get = (path: string, role = 'owner') =>
  request(app).get(`/api${path}`).set('Cookie', cookies[role]);
const del = (path: string, role = 'owner') =>
  request(app).delete(`/api${path}`).set('Origin', origin).set('Cookie', cookies[role]);
beforeAll(async () => {
  // This suite refuses any database outside the isolated test schema.
  if (!process.env.DATABASE_URL?.includes('/taskflow_test'))
    throw new Error('Unsafe test database');
  await db.workspace.deleteMany();
  await db.user.deleteMany();
  await db.mailJob.deleteMany();
  await db.storageCleanup.deleteMany();
  const passwordHash = await bcrypt.hash(password, 12);
  for (const role of ['owner', 'member', 'viewer', 'outsider', 'invitee']) {
    const user = await db.user.create({
      data: {
        name: `Test ${role}`,
        email: `${role}@example.test`,
        passwordHash,
        emailVerified: true,
        emailNotifications: false,
      },
    });
    users[role] = user.id;
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', origin)
      .send({ email: user.email, password });
    expect(response.status).toBe(200);
    cookies[role] = response.headers['set-cookie'][0].split(';')[0];
  }
  const created = await post('/workspaces', { name: 'Integration workspace' });
  expect(created.status).toBe(201);
  workspaceId = created.body.data.id;
  await db.workspaceMember.createMany({
    data: [
      { workspaceId, userId: users.member, role: 'MEMBER' },
      { workspaceId, userId: users.viewer, role: 'VIEWER' },
    ],
  });
  const other = await post('/workspaces', { name: 'Private workspace' }, 'outsider');
  otherWorkspaceId = other.body.data.id;
  const project = await post('/projects', { name: 'Launch project', workspaceId });
  expect(project.status).toBe(201);
  projectId = project.body.data.id;
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  socketUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  for (const socket of sockets) socket.disconnect();
  await new Promise<void>((done) => socketServer.close(() => done()));
  await db.$disconnect();
});
describe('authentication and request security', () => {
  it('creates an empty account with a hashed password and a revocable HTTP-only cookie', async () => {
    const result = await post('/auth/register', {
      name: 'New user',
      email: 'new@example.test',
      password,
      confirmPassword: password,
    });
    expect(result.status).toBe(201);
    expect(result.body.data.passwordHash).toBeUndefined();
    expect(result.headers['set-cookie'][0].includes('HttpOnly')).toBe(true);
    expect(result.headers['set-cookie'][0].includes('SameSite=Lax')).toBe(true);
    const user = await db.user.findUniqueOrThrow({ where: { email: 'new@example.test' } });
    expect(await bcrypt.compare(password, user.passwordHash)).toBe(true);
    expect(user.passwordHash === password).toBe(false);
    const cookie = result.headers['set-cookie'][0].split(';')[0];
    const empty = await request(app).get('/api/workspaces').set('Cookie', cookie);
    expect(empty.body.data).toEqual([]);
    await request(app)
      .post('/api/auth/logout')
      .set('Origin', origin)
      .set('Cookie', cookie)
      .expect(200);
    await request(app).get('/api/auth/me').set('Cookie', cookie).expect(401);
  });
  it('rejects duplicate accounts, invalid inputs, wrong passwords and untrusted origins', async () => {
    expect(
      (
        await post('/auth/register', {
          name: 'New user',
          email: 'new@example.test',
          password,
          confirmPassword: password,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await post('/auth/register', {
          name: 'X',
          email: 'broken',
          password: 'short',
          confirmPassword: 'no',
        })
      ).status,
    ).toBe(422);
    expect(
      (await post('/auth/login', { email: 'owner@example.test', password: 'incorrect' })).status,
    ).toBe(401);
    await request(app)
      .post('/api/workspaces')
      .set('Cookie', cookies.owner)
      .set('Origin', 'https://evil.example')
      .send({ name: 'Bad origin' })
      .expect(403);
    await request(app).get('/api/workspaces').expect(401);
  });
  it('verifies one-time email links and resets passwords while invalidating sessions', async () => {
    const job = await db.mailJob.findFirstOrThrow({
      where: { to: 'new@example.test', subject: { contains: 'Verify' } },
    });
    const token = new URL(job.body).searchParams.get('token');
    expect((await post('/auth/verify-email', { token })).status).toBe(200);
    expect((await post('/auth/verify-email', { token })).status).toBe(400);
    await post('/auth/forgot-password', { email: 'new@example.test' }).expect(200);
    const resetJob = await db.mailJob.findFirstOrThrow({
      where: { to: 'new@example.test', subject: { contains: 'Reset' } },
    });
    const resetToken = new URL(resetJob.body).searchParams.get('token');
    const session = await post('/auth/login', { email: 'new@example.test', password });
    const cookie = session.headers['set-cookie'][0].split(';')[0];
    await post('/auth/reset-password', {
      token: resetToken,
      password: 'a-new-synthetic-password',
    }).expect(200);
    await request(app).get('/api/auth/me').set('Cookie', cookie).expect(401);
    await post('/auth/reset-password', {
      token: resetToken,
      password: 'another-synthetic-password',
    }).expect(400);
    await post('/auth/login', {
      email: 'new@example.test',
      password: 'a-new-synthetic-password',
    }).expect(200);
  });
  it('rejects expired sessions', async () => {
    const token = 'a'.repeat(64);
    await db.session.create({
      data: {
        tokenHash: hashToken(token),
        userId: users.owner,
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    await request(app).get('/api/auth/me').set('Cookie', `taskflow=${token}`).expect(401);
  });
});
describe('authorization, data integrity, and collaboration', () => {
  it('enforces workspace role boundaries and tenant isolation', async () => {
    expect((await get(`/workspaces/${workspaceId}`, 'outsider')).status).toBe(404);
    expect((await get(`/projects/${projectId}`, 'outsider')).status).toBe(404);
    expect((await post('/projects', { name: 'Forbidden', workspaceId }, 'member')).status).toBe(
      403,
    );
    expect(
      (await patch(`/workspaces/${workspaceId}`, { name: 'Forbidden' }, 'viewer')).status,
    ).toBe(403);
    const membership = await db.workspaceMember.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId, userId: users.owner } },
    });
    expect((await del(`/workspaces/${workspaceId}/members/${membership.id}`)).status).toBe(403);
    const search = await get('/search?q=Private');
    expect(search.body.data.workspaces).toEqual([]);
  });
  it('validates project dates and foreign task relations', async () => {
    const invalid = await post(`/projects/${projectId}/tasks`, { title: ' ' });
    expect(invalid.status).toBe(422);
    expect(invalid.body.errors.title).toBeDefined();
    expect(
      (
        await post('/projects', {
          name: 'Bad dates',
          workspaceId,
          startDate: '2026-10-10T00:00:00.000Z',
          dueDate: '2026-10-01T00:00:00.000Z',
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await post(`/projects/${projectId}/tasks`, {
          title: 'Wrong assignee',
          assigneeIds: [users.outsider],
        })
      ).status,
    ).toBe(422);
    expect(
      (await post(`/projects/${projectId}/tasks`, { title: 'Viewer task' }, 'viewer')).status,
    ).toBe(403);
  });
  it('creates tasks and stores status, ordering, labels, subtasks, and assignments in PostgreSQL', async () => {
    const label = await post(
      `/projects/${projectId}/labels`,
      { name: 'Backend', color: '#635bff' },
      'member',
    );
    expect(label.status).toBe(201);
    const result = await post(
      `/projects/${projectId}/tasks`,
      {
        title: 'Build authentication',
        description: 'Complete the secure flow',
        priority: 'HIGH',
        assigneeIds: [users.member],
        labelIds: [label.body.data.id],
      },
      'member',
    );
    expect(result.status).toBe(201);
    taskId = result.body.data.id;
    const subtask = await post(
      `/tasks/${taskId}/subtasks`,
      { title: 'Review session security' },
      'member',
    );
    expect(subtask.status).toBe(201);
    await patch(
      `/tasks/${taskId}/subtasks/${subtask.body.data.id}`,
      { completed: true },
      'member',
    ).expect(200);
    await patch(
      `/tasks/${taskId}`,
      { status: 'IN_PROGRESS', position: 512, version: 0 },
      'member',
    ).expect(200);
    const task = await db.task.findUniqueOrThrow({
      where: { id: taskId },
      include: { subtasks: true, assignees: true, labels: true },
    });
    expect(task.status).toBe('IN_PROGRESS');
    expect(task.position).toBe(512);
    expect(task.version).toBe(1);
    expect(task.subtasks[0].completed).toBe(true);
    expect(task.labels).toHaveLength(1);
    expect(task.assignees[0].userId).toBe(users.member);
  });
  it('detects concurrent task edits and never silently overwrites a newer revision', async () => {
    const results = await Promise.all([
      patch(`/tasks/${taskId}`, { title: 'First concurrent edit', version: 1 }),
      patch(`/tasks/${taskId}`, { title: 'Second concurrent edit', version: 1 }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const task = await db.task.findUniqueOrThrow({ where: { id: taskId } });
    expect(task.version).toBe(2);
  });
  it('enforces comment authorship, saves mentions, and prevents cross-tenant reads', async () => {
    const comment = await post(
      `/tasks/${taskId}/comments`,
      { body: 'Ready for review @owner@example.test' },
      'member',
    );
    expect(comment.status).toBe(201);
    expect(
      (await patch(`/tasks/${taskId}/comments/${comment.body.data.id}`, { body: 'Hijacked' }))
        .status,
    ).toBe(403);
    expect((await get(`/tasks/${taskId}/comments`, 'outsider')).status).toBe(404);
    expect(
      (await post(`/tasks/${taskId}/comments`, { body: 'Cannot comment' }, 'viewer')).status,
    ).toBe(403);
    const notification = await db.notification.findFirst({
      where: { userId: users.owner, type: 'TASK_MENTION' },
    });
    expect(notification).not.toBeNull();
    await patch(
      `/tasks/${taskId}/comments/${comment.body.data.id}`,
      { body: 'Updated by the author' },
      'member',
    ).expect(200);
  });
  it('accepts secure invitations only for the verified intended recipient', async () => {
    const invitation = await post(`/workspaces/${workspaceId}/invitations`, {
      email: 'invitee@example.test',
      role: 'MEMBER',
    });
    expect(invitation.status).toBe(201);
    const token = new URL(invitation.body.data.inviteUrl).pathname.split('/').pop();
    await post('/invitations/accept', { token }, 'outsider').expect(403);
    await db.user.update({ where: { id: users.invitee }, data: { emailVerified: false } });
    await post('/invitations/accept', { token }, 'invitee').expect(403);
    await db.user.update({ where: { id: users.invitee }, data: { emailVerified: true } });
    await post('/invitations/accept', { token }, 'invitee').expect(200);
    await post('/invitations/accept', { token }, 'invitee').expect(400);
    expect(
      (
        await db.workspaceMember.findUniqueOrThrow({
          where: { workspaceId_userId: { workspaceId, userId: users.invitee } },
        })
      ).role,
    ).toBe('MEMBER');
  });
  it('sniffs upload content and requires workspace access for private downloads', async () => {
    const bad = await request(app)
      .post(`/api/tasks/${taskId}/attachments`)
      .set('Cookie', cookies.owner)
      .set('Origin', origin)
      .attach('file', Buffer.from('<script>alert(1)</script>'), {
        filename: 'fake.png',
        contentType: 'image/png',
      });
    expect(bad.status).toBe(422);
    const bytes = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF');
    const upload = await request(app)
      .post(`/api/tasks/${taskId}/attachments`)
      .set('Cookie', cookies.owner)
      .set('Origin', origin)
      .attach('file', bytes, {
        filename: 'requirements.pdf',
        contentType: 'application/octet-stream',
      });
    expect(upload.status).toBe(201);
    const id = upload.body.data.id;
    await get(`/attachments/${id}/download`, 'viewer').expect(200);
    await get(`/attachments/${id}/download`, 'outsider').expect(404);
    await request(app).get(`/api/attachments/${id}/download`).expect(401);
    await del(`/attachments/${id}`).expect(200);
    expect(await db.attachment.count({ where: { id } })).toBe(0);
    expect(await db.storageCleanup.count()).toBeGreaterThan(0);
    await cleanStorage();
    expect(await db.storageCleanup.count()).toBe(0);
  });
  it('calculates analytics from persisted tasks and isolates notification ownership', async () => {
    const stats = await get(`/projects/${projectId}/analytics`);
    expect(stats.body.data.total).toBe(1);
    expect(stats.body.data.byStatus).toEqual([{ name: 'IN_PROGRESS', value: 1 }]);
    const notifications = await get('/notifications');
    const id = notifications.body.data.items[0].id;
    await patch(`/notifications/${id}/read`, {}, 'outsider').expect(200);
    expect((await db.notification.findUniqueOrThrow({ where: { id } })).readAt).toBeNull();
    await patch(`/notifications/${id}/read`, {}).expect(200);
    expect((await db.notification.findUniqueOrThrow({ where: { id } })).readAt).not.toBeNull();
    const query = await get(
      `/projects/${projectId}/tasks?priority=HIGH&status=IN_PROGRESS&limit=1`,
    );
    expect(query.body.data.total).toBe(1);
    expect(query.body.data.items).toHaveLength(1);
    expect((await get(`/projects/${projectId}/tasks?limit=9999`)).status).toBe(422);
  });
  it('broadcasts persisted updates to authorized Socket.IO rooms and rejects outsiders', async () => {
    async function socket(role: string) {
      const client = connect(socketUrl, {
        transports: ['websocket'],
        extraHeaders: { Origin: origin, Cookie: cookies[role] },
        reconnection: false,
      });
      sockets.push(client);
      await new Promise<void>((done, reject) => {
        client.once('connect', () => done());
        client.once('connect_error', reject);
      });
      return client;
    }
    const owner = await socket('owner');
    const outsider = await socket('outsider');
    const joined = await owner.timeout(3000).emitWithAck('join', { projectId });
    expect(joined.success).toBe(true);
    const denied = await outsider.timeout(3000).emitWithAck('join', { projectId });
    expect(denied.success).toBe(false);
    const event = new Promise<{ projectId: string }>((done) => owner.once('data:changed', done));
    await patch(`/tasks/${taskId}`, { status: 'DONE', version: 2 }).expect(200);
    expect((await event).projectId).toBe(projectId);
    const presence = await owner.timeout(3000).emitWithAck('presence', projectId);
    expect(presence.some((p: { id: string }) => p.id === users.owner)).toBe(true);
    expect(presence.some((p: { id: string }) => p.id === users.outsider)).toBe(false);
  });
  it('accepts same-origin polling without an Origin header and rejects foreign socket origins', async () => {
    const client = connect(socketUrl, {
      transports: ['polling'],
      extraHeaders: { 'Sec-Fetch-Site': 'same-origin', Cookie: cookies.owner },
      reconnection: false,
    });
    sockets.push(client);
    await new Promise<void>((done, reject) => {
      client.once('connect', () => done());
      client.once('connect_error', reject);
    });
    client.emit('join', { projectId }, 'invalid-callback');
    client.emit('presence', projectId, 'invalid-callback');
    expect((await client.timeout(3000).emitWithAck('join', { projectId })).success).toBe(true);
    const outsider = connect(socketUrl, {
      transports: ['websocket'],
      extraHeaders: { Origin: 'https://evil.example', Cookie: cookies.owner },
      reconnection: false,
    });
    sockets.push(outsider);
    const rejected = await new Promise<boolean>((done) => {
      outsider.once('connect_error', () => done(true));
      outsider.once('connect', () => done(false));
    });
    expect(rejected).toBe(true);
  });
  it('removes assignments and access when a member leaves, and publishes API documentation', async () => {
    const member = await db.workspaceMember.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId, userId: users.member } },
    });
    await del(`/workspaces/${workspaceId}/members/${member.id}`).expect(200);
    await get(`/tasks/${taskId}`, 'member').expect(404);
    expect(await db.taskAssignee.count({ where: { userId: users.member, taskId } })).toBe(0);
    const docs = await request(app).get('/api/openapi.json').expect(200);
    expect(docs.body.paths['/tasks/{id}'].patch.requestBody).toBeDefined();
    expect(docs.body.paths['/auth/login']).toBeDefined();
    expect(docs.body.paths['/workspaces/{id}/invitations']).toBeDefined();
  });
  it('delivers development email to a private outbox without losing queued jobs', async () => {
    const job = await db.mailJob.create({
      data: { to: 'mail@example.test', subject: 'Delivery test', body: 'Synthetic message' },
    });
    await deliverMail();
    expect(await db.mailJob.findUnique({ where: { id: job.id } })).toBeNull();
    const saved = JSON.parse(
      await readFile(resolve(env.UPLOAD_DIR, '.mail', `${job.id}.json`), 'utf8'),
    );
    expect(saved.subject).toBe('Delivery test');
  });
  it('deletes a workspace with cascading project records', async () => {
    await del(`/workspaces/${otherWorkspaceId}`, 'outsider').expect(200);
    expect(await db.workspaceMember.count({ where: { workspaceId: otherWorkspaceId } })).toBe(0);
    expect((await auth()).status).toBe(200);
  });
});
