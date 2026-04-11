import * as notificationsService from './notifications.service.js';
import { authenticate } from '../../middleware/auth.middleware.js';

export const notificationsRoutes = async (fastify) => {
  fastify.get('/', {
    preHandler: authenticate,
    schema: {
      tags: ['Notifications'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
          unreadOnly: { type: 'boolean', default: false },
        },
      },
    },
  }, async (req) => notificationsService.getNotifications(req.user.id, req.query));

  fastify.patch('/:id/read', { preHandler: authenticate }, async (req) => {
    return notificationsService.markAsRead(req.user.id, req.params.id);
  });

  fastify.post('/read-all', { preHandler: authenticate }, async (req) => {
    return notificationsService.markAllAsRead(req.user.id);
  });

  fastify.delete('/:id', { preHandler: authenticate }, async (req, reply) => {
    await notificationsService.deleteNotification(req.user.id, req.params.id);
    return reply.send({ message: '삭제되었습니다.' });
  });
};
