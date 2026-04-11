import prisma from '../../config/database.js';

const postInclude = {
  user: { select: { id: true, name: true, nickname: true, avatar: true } },
  _count: { select: { comments: true, likes: true } },
};

export const getPosts = async ({ page = 1, limit = 20, lessonId, search }) => {
  const where = {
    ...(lessonId && { lessonId }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: postInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.post.count({ where }),
  ]);

  return { posts, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getPost = async (postId, userId) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      ...postInclude,
      comments: {
        where: { parentId: null },
        include: {
          user: { select: { id: true, name: true, nickname: true, avatar: true } },
          replies: {
            include: {
              user: { select: { id: true, name: true, nickname: true, avatar: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!post) throw { statusCode: 404, message: '게시글을 찾을 수 없습니다.' };

  let isLiked = false;
  if (userId) {
    const like = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    isLiked = !!like;
  }

  return { ...post, isLiked };
};

export const createPost = async (userId, data) => {
  return prisma.post.create({
    data: { ...data, userId },
    include: postInclude,
  });
};

export const updatePost = async (postId, userId, role, data) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw { statusCode: 404, message: '게시글을 찾을 수 없습니다.' };
  if (post.userId !== userId && role !== 'ADMIN') {
    throw { statusCode: 403, message: '수정 권한이 없습니다.' };
  }
  return prisma.post.update({ where: { id: postId }, data, include: postInclude });
};

export const deletePost = async (postId, userId, role) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw { statusCode: 404, message: '게시글을 찾을 수 없습니다.' };
  if (post.userId !== userId && role !== 'ADMIN') {
    throw { statusCode: 403, message: '삭제 권한이 없습니다.' };
  }
  await prisma.post.delete({ where: { id: postId } });
};

export const createComment = async (userId, postId, { content, parentId }) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw { statusCode: 404, message: '게시글을 찾을 수 없습니다.' };

  const comment = await prisma.comment.create({
    data: { userId, postId, content, parentId },
    include: {
      user: { select: { id: true, name: true, nickname: true, avatar: true } },
    },
  });

  // 게시글 작성자에게 알림
  if (post.userId !== userId) {
    await prisma.notification.create({
      data: {
        userId: post.userId,
        title: '새 댓글',
        message: `게시글에 새 댓글이 달렸습니다.`,
        type: 'COMMENT',
      },
    });
  }

  return comment;
};

export const deleteComment = async (commentId, userId, role) => {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw { statusCode: 404, message: '댓글을 찾을 수 없습니다.' };
  if (comment.userId !== userId && role !== 'ADMIN') {
    throw { statusCode: 403, message: '삭제 권한이 없습니다.' };
  }
  await prisma.comment.delete({ where: { id: commentId } });
};

export const toggleLike = async (userId, postId) => {
  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { userId_postId: { userId, postId } } });
    return { liked: false };
  } else {
    await prisma.like.create({ data: { userId, postId } });
    return { liked: true };
  }
};

export const toggleBookmark = async (userId, courseId) => {
  const existing = await prisma.bookmark.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    return { bookmarked: false };
  } else {
    await prisma.bookmark.create({ data: { userId, courseId } });
    return { bookmarked: true };
  }
};

export const getMyBookmarks = async (userId) => {
  return prisma.bookmark.findMany({
    where: { userId },
    include: {
      course: {
        select: {
          id: true, title: true, thumbnail: true, price: true, level: true,
          instructor: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};
