import { Server } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { parse } from 'cookie';
import { z } from 'zod';
import { env } from '../config/env.js';
import { resolveSession } from '../services/auth.service.js';
import { workspaceAccess, projectAccess } from '../services/access.service.js';
import { bindEvents } from '../services/events.service.js';
import { cookieName } from '../middleware/auth.js';
import { idSchema } from '../../../shared/validation.js';
export function setupSockets(server: HttpServer) {
  const io = new Server(server, {
    cors: { origin: env.CLIENT_URL, credentials: true },
    allowRequest: (req, callback) =>
      callback(
        null,
        req.headers.origin
          ? req.headers.origin === new URL(env.CLIENT_URL).origin
          : req.headers['sec-fetch-site'] === 'same-origin',
      ),
  });
  io.use(async (socket, next) => {
    try {
      const session = await resolveSession(
        parse(socket.handshake.headers.cookie ?? '')[cookieName],
      );
      if (!session) return next(new Error('Unauthorized'));
      socket.data.user = session.user;
      socket.data.sessionId = session.id;
      socket.data.token = parse(socket.handshake.headers.cookie ?? '')[cookieName];
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });
  io.on('connection', (socket) => {
    const userId: string = socket.data.user.id;
    socket.join(`user:${userId}`);
    socket.on('join', async (input: unknown, ack?: (data: { success: boolean }) => void) => {
      try {
        if (!(await resolveSession(socket.data.token))) {
          socket.disconnect();
          return;
        }
        const room = z
          .object({ workspaceId: idSchema.optional(), projectId: idSchema.optional() })
          .parse(input);
        for (const previous of socket.rooms)
          if (previous.startsWith('workspace:') || previous.startsWith('project:'))
            await socket.leave(previous);
        if (room.workspaceId) {
          await workspaceAccess(userId, room.workspaceId);
          await socket.join(`workspace:${room.workspaceId}`);
        }
        if (room.projectId) {
          await projectAccess(userId, room.projectId);
          await socket.join(`project:${room.projectId}`);
          socket.to(`project:${room.projectId}`).emit('presence:changed');
        }
        (typeof ack === 'function' ? ack : undefined)?.({ success: true });
      } catch {
        (typeof ack === 'function' ? ack : undefined)?.({ success: false });
      }
    });
    socket.on(
      'presence',
      async (
        projectId: unknown,
        ack?: (users: { id: string; name: string; avatar: string | null }[]) => void,
      ) => {
        try {
          const id = idSchema.parse(projectId);
          await projectAccess(userId, id);
          if (!(await resolveSession(socket.data.token))) return socket.disconnect();
          const peers = await io.in(`project:${id}`).fetchSockets();
          const users = new Map(
            peers.map((peer) => [
              peer.data.user.id,
              { id: peer.data.user.id, name: peer.data.user.name, avatar: peer.data.user.avatar },
            ]),
          );
          (typeof ack === 'function' ? ack : undefined)?.([...users.values()]);
        } catch {
          (typeof ack === 'function' ? ack : undefined)?.([]);
        }
      },
    );
    const timer = setInterval(async () => {
      try {
        if (!(await resolveSession(socket.data.token))) socket.disconnect();
      } catch {
        socket.disconnect();
      }
    }, 30000);
    timer.unref();
    socket.on('disconnecting', () => {
      for (const room of socket.rooms)
        if (room.startsWith('project:')) socket.to(room).emit('presence:changed');
    });
    socket.on('disconnect', () => clearInterval(timer));
  });
  bindEvents(io);
  return io;
}
