import { deliverMail } from './services/mail.service.js';
import { cleanStorage } from './services/cleanup.service.js';
import { createServer } from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';
import { db } from './config/db.js';
import { setupSockets } from './sockets/index.js';
import { deliverDeadlines } from './services/notification.service.js';
const server = createServer(app);
const io = setupSockets(server);
await db.$connect();
server.listen(env.PORT, '0.0.0.0', () => console.info(`TaskFlow API listening on ${env.PORT}`));
let running = false;
const maintenance = async () => {
  if (running) return;
  running = true;
  try {
    await deliverMail();
    await cleanStorage();
    await deliverDeadlines();
    await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await db.authToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  } catch {
    console.error('Maintenance job failed');
  } finally {
    running = false;
  }
};
void maintenance();
const timer = setInterval(() => void maintenance(), 60000);
timer.unref();
async function shutdown() {
  clearInterval(timer);
  io.close();
  server.close();
  await db.$disconnect();
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
