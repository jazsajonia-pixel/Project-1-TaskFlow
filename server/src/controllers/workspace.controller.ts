import { z } from 'zod';
import {
  workspaceSchema,
  emailSchema,
  roleSchema,
  tokenSchema,
} from '../../../shared/validation.js';
import * as service from '../services/workspace.service.js';
import { activityList } from '../services/events.service.js';
import { workspaceAccess } from '../services/access.service.js';
import { endpoint, requestSchema as req, params, pageQuery } from './endpoint.js';
export const list = endpoint(req(), (_, uid) => service.listWorkspaces(uid));
export const create = endpoint(
  req(workspaceSchema),
  (i, uid) => service.createWorkspace(uid, i.body),
  201,
);
export const get = endpoint(req(undefined, params('id')), (i, uid) =>
  service.getWorkspace(uid, i.params.id),
);
export const update = endpoint(req(workspaceSchema.partial(), params('id')), (i, uid) =>
  service.updateWorkspace(uid, i.params.id, i.body),
);
export const remove = endpoint(req(undefined, params('id')), (i, uid) =>
  service.deleteWorkspace(uid, i.params.id),
);
export const members = endpoint(req(undefined, params('id'), pageQuery), (i, uid) =>
  service.listMembers(uid, i.params.id, i.query.page, i.query.limit),
);
export const changeMember = endpoint(
  req(z.object({ role: roleSchema }), params('id', 'memberId')),
  (i, uid) => service.changeMember(uid, i.params.id, i.params.memberId, i.body.role),
);
export const removeMember = endpoint(req(undefined, params('id', 'memberId')), (i, uid) =>
  service.changeMember(uid, i.params.id, i.params.memberId),
);
export const invite = endpoint(
  req(z.object({ email: emailSchema, role: roleSchema }), params('id')),
  (i, uid) => service.invite(uid, i.params.id, i.body.email, i.body.role),
  201,
);
export const invitations = endpoint(req(undefined, params('id')), (i, uid) =>
  service.invitations(uid, i.params.id),
);
export const revoke = endpoint(req(undefined, params('id', 'invitationId')), (i, uid) =>
  service.revokeInvitation(uid, i.params.id, i.params.invitationId),
);
export const accept = endpoint(req(z.object({ token: tokenSchema })), (i, uid) =>
  service.acceptInvitation(uid, i.body.token),
);
export const activity = endpoint(req(undefined, params('id'), pageQuery), async (i, uid) => {
  await workspaceAccess(uid, i.params.id);
  return activityList({ workspaceId: i.params.id }, i.query.page, i.query.limit);
});
