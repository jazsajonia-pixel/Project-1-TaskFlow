import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import * as c from '../controllers/task.controller.js';
import { route } from './register.js';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0 },
});
route('get', '/tasks', c.mine, 'Tasks', 'List tasks assigned to you');
route('get', '/projects/:id/tasks', c.list, 'Tasks', 'List and filter project tasks');
route('post', '/projects/:id/tasks', c.create, 'Tasks', 'Create a task');
route('get', '/tasks/:id', c.get, 'Tasks', 'Get task details');
route(
  'patch',
  '/tasks/:id',
  c.update,
  'Tasks',
  'Update a task or persist a board move (version required)',
);
route('delete', '/tasks/:id', c.remove, 'Tasks', 'Delete a task');
route('get', '/tasks/:id/comments', c.listComments, 'Comments', 'List task comments');
route(
  'post',
  '/tasks/:id/comments',
  c.createComment,
  'Comments',
  'Add a comment; mention with @email@example.com',
);
route(
  'patch',
  '/tasks/:id/comments/:commentId',
  c.updateComment,
  'Comments',
  'Edit your own comment',
);
route(
  'delete',
  '/tasks/:id/comments/:commentId',
  c.deleteComment,
  'Comments',
  'Delete your own comment',
);
route('post', '/tasks/:id/subtasks', c.createSubtask, 'Subtasks', 'Create a subtask');
route('patch', '/tasks/:id/subtasks/:subtaskId', c.updateSubtask, 'Subtasks', 'Update a subtask');
route('delete', '/tasks/:id/subtasks/:subtaskId', c.deleteSubtask, 'Subtasks', 'Delete a subtask');
route('post', '/tasks/:id/attachments', c.upload, 'Files', 'Upload a validated attachment', {
  multipart: true,
  middleware: [rateLimit({ windowMs: 60000, limit: 20 }), upload.single('file')],
});
route('get', '/attachments/:id/download', c.download, 'Files', 'Download a private attachment');
route('delete', '/attachments/:id', c.deleteAttachment, 'Files', 'Delete an attachment');

route('get', '/tasks/:id/activity', c.activity, 'Activity', 'Get task activity history');
