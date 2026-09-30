import { z } from 'zod';
import { projectSchema, idSchema } from '../../../shared/validation.js';
import * as service from '../services/project.service.js';
import { analytics } from '../services/analytics.service.js';
import { activityList } from '../services/events.service.js';
import { projectAccess } from '../services/access.service.js';
import { projectFiles } from '../services/attachment.service.js';
import { endpoint, requestSchema as req, params, pageQuery } from './endpoint.js';
export const list = endpoint(
  req(undefined, undefined, pageQuery.extend({ workspaceId: idSchema.optional() })),
  (i, uid) => service.listProjects(uid, i.query.workspaceId, i.query.page, i.query.limit),
);
export const create = endpoint(
  req(projectSchema),
  (i, uid) => service.createProject(uid, i.body),
  201,
);
export const get = endpoint(req(undefined, params('id')), (i, uid) =>
  service.getProject(uid, i.params.id),
);
export const update = endpoint(
  req(projectSchema.omit({ workspaceId: true }).partial(), params('id')),
  (i, uid) => service.updateProject(uid, i.params.id, i.body),
);
export const remove = endpoint(req(undefined, params('id')), (i, uid) =>
  service.deleteProject(uid, i.params.id),
);
export const addMember = endpoint(req(z.object({ userId: idSchema }), params('id')), (i, uid) =>
  service.projectMember(uid, i.params.id, i.body.userId),
);
export const removeMember = endpoint(req(undefined, params('id', 'userId')), (i, uid) =>
  service.projectMember(uid, i.params.id, i.params.userId, true),
);
export const createLabel = endpoint(
  req(
    z.object({
      name: z.string().trim().min(1).max(40),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    }),
    params('id'),
  ),
  (i, uid) => service.createLabel(uid, i.params.id, i.body),
  201,
);
export const deleteLabel = endpoint(req(undefined, params('id', 'labelId')), (i, uid) =>
  service.deleteLabel(uid, i.params.id, i.params.labelId),
);
export const stats = endpoint(req(undefined, params('id')), (i, uid) =>
  analytics(uid, undefined, i.params.id),
);
export const activity = endpoint(req(undefined, params('id'), pageQuery), async (i, uid) => {
  await projectAccess(uid, i.params.id);
  return activityList({ projectId: i.params.id }, i.query.page, i.query.limit);
});
export const files = endpoint(req(undefined, params('id'), pageQuery), (i, uid) =>
  projectFiles(uid, i.params.id, i.query.page, i.query.limit),
);
