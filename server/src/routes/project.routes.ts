import * as c from '../controllers/project.controller.js';
import { route } from './register.js';
route('get', '/projects', c.list, 'Projects', 'List accessible projects');
route('post', '/projects', c.create, 'Projects', 'Create a project (admin or owner)');
route('get', '/projects/:id', c.get, 'Projects', 'Get a project');
route('patch', '/projects/:id', c.update, 'Projects', 'Edit or archive a project');
route('delete', '/projects/:id', c.remove, 'Projects', 'Delete a project');
route(
  'post',
  '/projects/:id/members',
  c.addMember,
  'Members',
  'Add a workspace member to a project',
);
route(
  'delete',
  '/projects/:id/members/:userId',
  c.removeMember,
  'Members',
  'Remove a project member',
);
route('post', '/projects/:id/labels', c.createLabel, 'Labels', 'Create a project label');
route('delete', '/projects/:id/labels/:labelId', c.deleteLabel, 'Labels', 'Delete a project label');
route('get', '/projects/:id/analytics', c.stats, 'Analytics', 'Get project analytics');
route('get', '/projects/:id/activity', c.activity, 'Activity', 'Get project activity');
route('get', '/projects/:id/files', c.files, 'Files', 'List project attachments');
