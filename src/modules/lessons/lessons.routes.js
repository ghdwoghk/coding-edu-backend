import * as lessonsService from './lessons.service.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';

export const lessonsRoutes = async (fastify) => {
  // 강의 상세
  fastify.get('/:id', { preHandler: authenticate }, async (req) => {
    return lessonsService.getLesson(req.params.id, req.user.id, req.user.role);
  });

  // 챕터에 강의 생성
  fastify.post('/chapters/:chapterId', {
    preHandler: authorize('INSTRUCTOR', 'ADMIN'),
    schema: {
      tags: ['Lessons'],
      body: {
        type: 'object',
        required: ['title', 'type'],
        properties: {
          title: { type: 'string' },
          type: { type: 'string', enum: ['VIDEO', 'TEXT', 'CODING', 'QUIZ'] },
          isFree: { type: 'boolean', default: false },
          content: { type: 'object' },
        },
      },
    },
  }, async (req, reply) => {
    const lesson = await lessonsService.createLesson(
      req.params.chapterId, req.user.id, req.user.role, req.body
    );
    return reply.status(201).send(lesson);
  });

  // 섹션에 챕터 생성
  fastify.post('/sections/:sectionId/chapters', {
    preHandler: authorize('INSTRUCTOR', 'ADMIN'),
    schema: {
      tags: ['Lessons'],
      body: {
        type: 'object',
        required: ['title'],
        properties: { title: { type: 'string' } },
      },
    },
  }, async (req, reply) => {
    const chapter = await lessonsService.createChapter(
      req.params.sectionId, req.user.id, req.user.role, req.body
    );
    return reply.status(201).send(chapter);
  });
};
