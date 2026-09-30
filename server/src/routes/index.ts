import './auth.routes.js';
import './workspace.routes.js';
import './project.routes.js';
import './task.routes.js';
import { route, router, paths } from './register.js';
import * as c from '../controllers/general.controller.js';
route('get', '/dashboard', c.dashboard, 'Analytics', 'Get workspace dashboard analytics');
route('get', '/search', c.search, 'Search', 'Search only your accessible resources');
route(
  'get',
  '/notifications',
  c.notifications,
  'Notifications',
  'List notifications and unread count',
);
route(
  'patch',
  '/notifications/read-all',
  c.readAll,
  'Notifications',
  'Mark all notifications read',
);
route(
  'patch',
  '/notifications/:id/read',
  c.readNotification,
  'Notifications',
  'Mark a notification read',
);
route(
  'delete',
  '/notifications/:id',
  c.deleteNotification,
  'Notifications',
  'Delete a notification',
);
export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'TaskFlow API',
    version: '1.0.0',
    description:
      'Cookie-authenticated collaboration API. All mutations require an Origin header matching CLIENT_URL. Roles: OWNER (all), ADMIN (projects/members), MEMBER (tasks/collaboration), VIEWER (read only). All workspace members can read projects; project membership represents the project team, not an additional access boundary. Lists are paginated (page, limit; maximum 100). Task mutations require the latest version to prevent lost updates.',
  },
  servers: [{ url: '/api' }],
  paths,
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'taskflow',
        description:
          'Production cookie name: __Host-taskflow. Obtained through login or registration.',
      },
    },
    schemas: {
      Success: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { description: 'Resource, paginated {items,total,page,limit}, or null' },
        },
      },
      Error: {
        type: 'object',
        required: ['success', 'message'],
        properties: {
          success: { type: 'boolean', enum: [false] },
          message: { type: 'string' },
          errors: {
            type: 'object',
            additionalProperties: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  },
};
export { router };
