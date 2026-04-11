import * as usersService from './users.service.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';

export const usersRoutes = async (fastify) => {
  // 내 프로필
  fastify.get('/me', { preHandler: authenticate }, async (req, reply) => {
    return usersService.getProfile(req.user.id);
  });

  // 프로필 수정
  fastify.patch('/me', {
    preHandler: authenticate,
    schema: {
      tags: ['Users'],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2 },
          nickname: { type: 'string', minLength: 2 },
          bio: { type: 'string', maxLength: 500 },
          avatar: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    return usersService.updateProfile(req.user.id, req.body);
  });

  // 비밀번호 변경
  fastify.post('/me/change-password', {
    preHandler: authenticate,
    schema: {
      tags: ['Users'],
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
    },
  }, async (req, reply) => {
    const { currentPassword, newPassword } = req.body;
    await usersService.changePassword(req.user.id, currentPassword, newPassword);
    return reply.send({ message: '비밀번호가 변경되었습니다.' });
  });

  // 내 수강 목록
  fastify.get('/me/enrollments', { preHandler: authenticate }, async (req) => {
    return usersService.getMyEnrollments(req.user.id);
  });

  // 내 수료증
  fastify.get('/me/certificates', { preHandler: authenticate }, async (req) => {
    return usersService.getMyCertificates(req.user.id);
  });

  // 내 학습 통계
  fastify.get('/me/stats', { preHandler: authenticate }, async (req) => {
    return usersService.getMyStats(req.user.id);
  });

  // 관리자: 전체 유저 조회
  fastify.get('/', {
    preHandler: authorize('ADMIN'),
    schema: {
      tags: ['Users'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
          search: { type: 'string' },
          role: { type: 'string', enum: ['STUDENT', 'INSTRUCTOR', 'ADMIN'] },
        },
      },
    },
  }, async (req) => {
    return usersService.getAllUsers(req.query);
  });
};
