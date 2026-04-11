import * as coursesService from './courses.service.js';
import { authenticate, authorize, optionalAuth } from '../../middleware/auth.middleware.js';

export const coursesRoutes = async (fastify) => {
  // 강의 목록 (공개)
  fastify.get('/', {
    preHandler: optionalAuth,
    schema: {
      tags: ['Courses'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 12 },
          search: { type: 'string' },
          level: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] },
          minPrice: { type: 'integer' },
          maxPrice: { type: 'integer' },
          sort: { type: 'string', enum: ['createdAt', 'popular', 'price'], default: 'createdAt' },
        },
      },
    },
  }, async (req) => coursesService.getCourses(req.query));

  // 강의 상세 (공개)
  fastify.get('/:id', { preHandler: optionalAuth }, async (req) => {
    return coursesService.getCourseById(req.params.id, req.user?.id);
  });

  // 강의 생성 (강사/관리자)
  fastify.post('/', {
    preHandler: authorize('INSTRUCTOR', 'ADMIN'),
    schema: {
      tags: ['Courses'],
      body: {
        type: 'object',
        required: ['title', 'description'],
        properties: {
          title: { type: 'string', minLength: 2 },
          description: { type: 'string' },
          thumbnail: { type: 'string' },
          price: { type: 'integer', default: 0 },
          level: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (req, reply) => {
    const course = await coursesService.createCourse(req.user.id, req.body);
    return reply.status(201).send(course);
  });

  // 강의 수정
  fastify.patch('/:id', {
    preHandler: authenticate,
    schema: {
      tags: ['Courses'],
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          thumbnail: { type: 'string' },
          price: { type: 'integer' },
          level: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] },
          status: { type: 'string', enum: ['DRAFT', 'PENDING', 'PUBLISHED', 'ARCHIVED'] },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (req) => {
    return coursesService.updateCourse(req.params.id, req.user.id, req.user.role, req.body);
  });

  // 강의 삭제
  fastify.delete('/:id', { preHandler: authenticate }, async (req, reply) => {
    await coursesService.deleteCourse(req.params.id, req.user.id, req.user.role);
    return reply.send({ message: '강의가 삭제되었습니다.' });
  });

  // 수강 신청
  fastify.post('/:id/enroll', { preHandler: authenticate }, async (req, reply) => {
    const enrollment = await coursesService.enrollCourse(req.user.id, req.params.id);
    return reply.status(201).send(enrollment);
  });

  // 섹션 생성
  fastify.post('/:id/sections', {
    preHandler: authenticate,
    schema: {
      tags: ['Courses'],
      body: {
        type: 'object',
        required: ['title'],
        properties: { title: { type: 'string' } },
      },
    },
  }, async (req, reply) => {
    const section = await coursesService.createSection(
      req.params.id, req.user.id, req.user.role, req.body
    );
    return reply.status(201).send(section);
  });

  // 리뷰 작성
  fastify.post('/:id/reviews', {
    preHandler: authenticate,
    schema: {
      tags: ['Courses'],
      body: {
        type: 'object',
        required: ['rating'],
        properties: {
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          content: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const review = await coursesService.createReview(req.user.id, req.params.id, req.body);
    return reply.status(201).send(review);
  });

  // 내 강의 목록 (강사)
  fastify.get('/instructor/my', {
    preHandler: authorize('INSTRUCTOR', 'ADMIN'),
  }, async (req) => {
    return coursesService.getInstructorCourses(req.user.id);
  });
};
