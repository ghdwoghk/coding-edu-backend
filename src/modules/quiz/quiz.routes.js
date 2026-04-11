import * as quizService from './quiz.service.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';

export const quizRoutes = async (fastify) => {
  // 퀴즈 제출
  fastify.post('/:quizId/submit', {
    preHandler: authenticate,
    schema: {
      tags: ['Quiz'],
      body: {
        type: 'object',
        required: ['answers'],
        properties: {
          answers: { type: 'object', additionalProperties: { type: 'string' } },
        },
      },
    },
  }, async (req, reply) => {
    const result = await quizService.submitQuiz(req.user.id, req.params.quizId, req.body.answers);
    return reply.status(201).send(result);
  });

  // 퀴즈 시도 이력
  fastify.get('/:quizId/attempts', { preHandler: authenticate }, async (req) => {
    return quizService.getQuizAttempts(req.user.id, req.params.quizId);
  });

  // 강의 과제 목록
  fastify.get('/assignments/course/:courseId', { preHandler: authenticate }, async (req) => {
    return quizService.getAssignments(req.params.courseId);
  });

  // 과제 제출
  fastify.post('/assignments/:assignmentId/submit', {
    preHandler: authenticate,
    schema: {
      tags: ['Quiz'],
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string' },
          fileUrl: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const result = await quizService.submitAssignment(req.user.id, req.params.assignmentId, req.body);
    return reply.status(201).send(result);
  });

  // 과제 채점 (강사/관리자)
  fastify.patch('/assignments/submissions/:submissionId/grade', {
    preHandler: authorize('INSTRUCTOR', 'ADMIN'),
    schema: {
      tags: ['Quiz'],
      body: {
        type: 'object',
        required: ['score'],
        properties: {
          score: { type: 'integer', minimum: 0, maximum: 100 },
          feedback: { type: 'string' },
        },
      },
    },
  }, async (req) => {
    return quizService.gradeAssignment(req.params.submissionId, req.user.id, req.user.role, req.body);
  });
};
