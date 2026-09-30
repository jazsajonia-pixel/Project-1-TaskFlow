import { z } from 'zod';
import { idSchema } from '../../../shared/validation.js';
import { analytics, search as searchService } from '../services/analytics.service.js';
import { listNotifications, changeNotification } from '../services/notification.service.js';
import { endpoint, requestSchema as req, params, pageQuery } from './endpoint.js';
export const dashboard = endpoint(
  req(undefined, undefined, z.object({ workspaceId: idSchema.optional() })),
  (i, uid) => analytics(uid, i.query.workspaceId),
);
export const search = endpoint(
  req(undefined, undefined, z.object({ q: z.string().trim().min(2).max(100) })),
  (i, uid) => searchService(uid, i.query.q),
);
export const notifications = endpoint(req(undefined, undefined, pageQuery), (i, uid) =>
  listNotifications(uid, i.query.page, i.query.limit),
);
export const readNotification = endpoint(req(undefined, params('id')), (i, uid) =>
  changeNotification(uid, i.params.id),
);
export const readAll = endpoint(req(), (_, uid) => changeNotification(uid));
export const deleteNotification = endpoint(req(undefined, params('id')), (i, uid) =>
  changeNotification(uid, i.params.id, true),
);
