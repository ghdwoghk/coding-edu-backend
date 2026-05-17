import prisma from '../../config/database.js';
import { optionalAuth } from '../../middleware/auth.middleware.js';

export const searchRoutes = async (fastify) => {
  fastify.get('/', {
    preHandler: optionalAuth,
    schema: {
      tags: ['Search'],
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['all', 'courses', 'posts'], default: 'all' },
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 10 },
        },
      },
    },
  }, async (req) => {
    const { q, type, page, limit } = req.query;
    const skip = (page - 1) * limit;
    const searchFilter = {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    };

    const results = {};

    if (type === 'all' || type === 'courses') {
      results.courses = await prisma.course.findMany({
        where: { ...searchFilter, status: 'PUBLISHED' },
        skip, take: limit,
        select: {
          id: true, title: true, thumbnail: true, price: true, level: true,
          instructor: { select: { name: true } },
          _count: { select: { enrollments: true } },
        },
      });
    }

    if (type === 'all' || type === 'posts') {
      results.posts = await prisma.post.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
          ],
        },
        skip, take: limit,
        select: {
          id: true, title: true, createdAt: true,
          user: { select: { name: true } },
          _count: { select: { comments: true, likes: true } },
        },
      });
    }

    return results;
  });

  // 인기 강의
  fastify.get('/popular', { preHandler: optionalAuth }, async () => {
    return prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      take: 8,
      select: {
        id: true, title: true, thumbnail: true, price: true, level: true,
        instructor: { select: { name: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { enrollments: { _count: 'desc' } },
    });
  });

  // 태그 목록
  fastify.get('/tags', async () => {
    return prisma.tag.findMany({
      include: { _count: { select: { courses: true } } },
      orderBy: { courses: { _count: 'desc' } },
      take: 20,
    });
  });
};
