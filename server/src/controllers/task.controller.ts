import { taskAccess } from '../services/access.service.js';
import { activityList } from '../services/events.service.js';
import { z } from 'zod';
import type { RequestHandler } from 'express';
import {
  taskSchema,
  taskPatchSchema,
  statusSchema,
  prioritySchema,
  commentSchema,
} from '../../../shared/validation.js';
import * as service from '../services/task.service.js';
import * as comments from '../services/comment.service.js';
import * as attachments from '../services/attachment.service.js';
import { endpoint, requestSchema as req, params, pageQuery } from './endpoint.js';
const filters = pageQuery.extend({
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  q: z.string().max(200).optional(),
  assigned: z.enum(['true', 'false']).optional(),
});
export const list = endpoint(req(undefined, params('id'), filters), (i, uid) =>
  service.listTasks(uid, {
    ...i.query,
    assigned: i.query.assigned === 'true',
    projectId: i.params.id,
  }),
);
export const mine = endpoint(req(undefined, undefined, filters), (i, uid) =>
  service.listTasks(uid, { ...i.query, assigned: true }),
);
export const create = endpoint(
  req(taskSchema, params('id')),
  (i, uid) => service.createTask(uid, i.params.id, i.body),
  201,
);
export const get = endpoint(req(undefined, params('id')), (i, uid) =>
  service.getTask(uid, i.params.id),
);
export const update = endpoint(req(taskPatchSchema, params('id')), (i, uid) =>
  service.updateTask(uid, i.params.id, i.body),
);
export const remove = endpoint(req(undefined, params('id')), (i, uid) =>
  service.deleteTask(uid, i.params.id),
);
export const listComments = endpoint(req(undefined, params('id'), pageQuery), (i, uid) =>
  comments.listComments(uid, i.params.id, i.query.page, i.query.limit),
);
export const createComment = endpoint(
  req(commentSchema, params('id')),
  (i, uid) => comments.createComment(uid, i.params.id, i.body.body),
  201,
);
export const updateComment = endpoint(req(commentSchema, params('id', 'commentId')), (i, uid) =>
  comments.editComment(uid, i.params.id, i.params.commentId, i.body.body),
);
export const deleteComment = endpoint(req(undefined, params('id', 'commentId')), (i, uid) =>
  comments.editComment(uid, i.params.id, i.params.commentId),
);
export const createSubtask = endpoint(
  req(z.object({ title: z.string().trim().min(1).max(200) }), params('id')),
  (i, uid) => service.createSubtask(uid, i.params.id, i.body.title),
  201,
);
export const updateSubtask = endpoint(
  req(
    z.object({
      title: z.string().trim().min(1).max(200).optional(),
      completed: z.boolean().optional(),
    }),
    params('id', 'subtaskId'),
  ),
  (i, uid) => service.updateSubtask(uid, i.params.id, i.params.subtaskId, i.body),
);
export const deleteSubtask = endpoint(req(undefined, params('id', 'subtaskId')), (i, uid) =>
  service.updateSubtask(uid, i.params.id, i.params.subtaskId),
);
export const upload: RequestHandler = async (request, response) => {
  const { id } = params('id').parse(request.params);
  const data = await attachments.uploadAttachment(response.locals.user.id, id, request.file);
  response.status(201).json({ success: true, data });
};
export const download: RequestHandler = async (request, response) => {
  const { id } = params('id').parse(request.params);
  const { attachment, data } = await attachments.downloadAttachment(response.locals.user.id, id);
  response.setHeader('Content-Type', attachment.mimeType);
  response.setHeader(
    'Content-Disposition',
    `attachment; filename*=UTF-8''${encodeURIComponent(attachment.originalFilename)}`,
  );
  response.setHeader('Cache-Control', 'private, no-store');
  response.send(data);
};
export const deleteAttachment = endpoint(req(undefined, params('id')), (i, uid) =>
  attachments.deleteAttachment(uid, i.params.id),
);

export const activity = endpoint(req(undefined, params('id'), pageQuery), async (i, uid) => {
  await taskAccess(uid, i.params.id);
  return activityList({ entity: 'task', entityId: i.params.id }, i.query.page, i.query.limit);
});
