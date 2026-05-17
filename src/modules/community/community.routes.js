import * as communityService from './community.service.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';

export const communityRoutes = async (fastify) => {
  // 게시글 목록
  fastify.get('/posts', {
    preHandler: optionalAuth,
    schema: {
      tags: ['Community'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
          lessonId: { type: 'string' },
          search: { type: 'string' },
        },
      },
    },
  }, async (req) => communityService.getPosts(req.query));

  // 게시글 상세
  fastify.get('/posts/:id', { preHandler: optionalAuth }, async (req) => {
    return communityService.getPost(req.params.id, req.user?.id);
  });

  // 게시글 작성
  fastify.post('/posts', {
    preHandler: authenticate,
    schema: {
      tags: ['Community'],
      body: {
        type: 'object',
        required: ['title', 'content'],
        properties: {
          title: { type: 'string', minLength: 2 },
          content: { type: 'string', minLength: 1 },
          lessonId: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const post = await communityService.createPost(req.user.id, req.body);
    return reply.status(201).send(post);
  });

  // 게시글 수정
  fastify.patch('/posts/:id', {
    preHandler: authenticate,
    schema: {
      tags: ['Community'],
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
        },
      },
    },
  }, async (req) => {
    return communityService.updatePost(req.params.id, req.user.id, req.user.role, req.body);
  });

  // 게시글 삭제
  fastify.delete('/posts/:id', { preHandler: authenticate }, async (req, reply) => {
    await communityService.deletePost(req.params.id, req.user.id, req.user.role);
    return reply.send({ message: '삭제되었습니다.' });
  });

  // 댓글 작성
  fastify.post('/posts/:id/comments', {
    preHandler: authenticate,
    schema: {
      tags: ['Community'],
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', minLength: 1 },
          parentId: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const comment = await communityService.createComment(req.user.id, req.params.id, req.body);
    return reply.status(201).send(comment);
  });

  // 댓글 삭제
  fastify.delete('/comments/:id', { preHandler: authenticate }, async (req, reply) => {
    await communityService.deleteComment(req.params.id, req.user.id, req.user.role);
    return reply.send({ message: '삭제되었습니다.' });
  });

  // 좋아요 토글
  fastify.post('/posts/:id/like', { preHandler: authenticate }, async (req) => {
    return communityService.toggleLike(req.user.id, req.params.id);
  });

  // 북마크 토글
  fastify.post('/bookmarks/:courseId', { preHandler: authenticate }, async (req) => {
    return communityService.toggleBookmark(req.user.id, req.params.courseId);
  });

  // 내 북마크
  fastify.get('/bookmarks', { preHandler: authenticate }, async (req) => {
    return communityService.getMyBookmarks(req.user.id);
  });
};
