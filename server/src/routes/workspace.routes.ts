import * as c from '../controllers/workspace.controller.js';
import { route } from './register.js';
route('get', '/workspaces', c.list, 'Workspaces', 'List your workspaces');
route('post', '/workspaces', c.create, 'Workspaces', 'Create a workspace');
route('get', '/workspaces/:id', c.get, 'Workspaces', 'Get a workspace');
route('patch', '/workspaces/:id', c.update, 'Workspaces', 'Update a workspace (admin or owner)');
route('delete', '/workspaces/:id', c.remove, 'Workspaces', 'Delete a workspace (owner only)');
route('get', '/workspaces/:id/members', c.members, 'Members', 'List workspace members');
route(
  'patch',
  '/workspaces/:id/members/:memberId',
  c.changeMember,
  'Members',
  'Change a workspace role',
);
route(
  'delete',
  '/workspaces/:id/members/:memberId',
  c.removeMember,
  'Members',
  'Remove a workspace member',
);
route('post', '/workspaces/:id/invitations', c.invite, 'Invitations', 'Send a secure invitation');
route('get', '/workspaces/:id/invitations', c.invitations, 'Invitations', 'List invitations');
route(
  'delete',
  '/workspaces/:id/invitations/:invitationId',
  c.revoke,
  'Invitations',
  'Revoke an invitation',
);
route(
  'post',
  '/invitations/accept',
  c.accept,
  'Invitations',
  'Accept an invitation for your verified email',
);
route('get', '/workspaces/:id/activity', c.activity, 'Activity', 'Get workspace activity');
