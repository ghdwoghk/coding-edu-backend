import * as adminService from './admin.service.js';
import { authorize } from '../../middleware/auth.middleware.js';

export const adminRoutes = async (fastify) => {
  fastify.addHook('preHandler', authorize('ADMIN'));

  // 대시보드 통계
  fastify.get('/dashboard', { schema: { tags: ['Admin'] } }, async () => {
    return adminService.getDashboard();
  });

  // 승인 대기 강의
  fastify.get('/courses/pending', { schema: { tags: ['Admin'] } }, async () => {
    return adminService.getPendingCourses();
  });

  // 강의 승인
  fastify.post('/courses/:id/approve', { schema: { tags: ['Admin'] } }, async (req) => {
    return adminService.approveCourse(req.params.id);
  });

  // 강의 반려
  fastify.post('/courses/:id/reject', {
    schema: {
      tags: ['Admin'],
      body: {
        type: 'object',
        required: ['reason'],
        properties: { reason: { type: 'string' } },
      },
    },
  }, async (req) => {
    return adminService.rejectCourse(req.params.id, req.body.reason);
  });

  // 사용자 역할 변경
  fastify.patch('/users/:id/role', {
    schema: {
      tags: ['Admin'],
      body: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['STUDENT', 'INSTRUCTOR', 'ADMIN'] },
        },
      },
    },
  }, async (req) => {
    return adminService.updateUserRole(req.params.id, req.body.role);
  });

  // 매출 통계
  fastify.get('/revenue', {
    schema: {
      tags: ['Admin'],
      querystring: {
        type: 'object',
        properties: {
          from: { type: 'string', format: 'date' },
          to: { type: 'string', format: 'date' },
        },
      },
    },
  }, async (req) => {
    return adminService.getRevenueStats(req.query);
  });
};
