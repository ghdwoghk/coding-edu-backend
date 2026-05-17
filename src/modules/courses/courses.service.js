import prisma from '../../config/database.js';

const courseSelect = {
  id: true, title: true, description: true, thumbnail: true,
  price: true, level: true, status: true, createdAt: true,
  instructor: { select: { id: true, name: true, avatar: true } },
  tags: { include: { tag: true } },
  _count: { select: { enrollments: true, sections: true, reviews: true } },
};

export const getCourses = async ({ page = 1, limit = 12, search, level, tags, minPrice, maxPrice, sort = 'createdAt' }) => {
  const where = {
    status: 'PUBLISHED',
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(level && { level }),
    ...(tags?.length && { tags: { some: { tag: { name: { in: tags } } } } }),
    ...(minPrice !== undefined && { price: { gte: minPrice } }),
    ...(maxPrice !== undefined && { price: { lte: maxPrice } }),
  };

  const orderBy = sort === 'popular'
    ? { enrollments: { _count: 'desc' } }
    : { [sort]: 'desc' };

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where, skip: (page - 1) * limit, take: limit,
      select: courseSelect, orderBy,
    }),
    prisma.course.count({ where }),
  ]);

  return { courses, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getCourseById = async (id, userId) => {
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      instructor: { select: { id: true, name: true, avatar: true, bio: true } },
      tags: { include: { tag: true } },
      sections: {
        orderBy: { order: 'asc' },
        include: {
          chapters: {
            orderBy: { order: 'asc' },
            include: {
              lessons: {
                orderBy: { order: 'asc' },
                select: { id: true, title: true, type: true, order: true, isFree: true },
              },
            },
          },
        },
      },
      reviews: {
        take: 10,
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { enrollments: true, reviews: true } },
    },
  });

  if (!course) throw { statusCode: 404, message: '강의를 찾을 수 없습니다.' };

  let isEnrolled = false;
  if (userId) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: id } },
    });
    isEnrolled = !!enrollment;
  }

  const avgRating = await prisma.review.aggregate({
    where: { courseId: id },
    _avg: { rating: true },
  });

  return { ...course, isEnrolled, avgRating: avgRating._avg.rating ?? 0 };
};

export const createCourse = async (instructorId, data) => {
  const { tags, ...courseData } = data;

  return prisma.course.create({
    data: {
      ...courseData,
      instructorId,
      tags: tags ? {
        create: tags.map((tagName) => ({
          tag: { connectOrCreate: { where: { name: tagName }, create: { name: tagName } } },
        })),
      } : undefined,
    },
    select: courseSelect,
  });
};

export const updateCourse = async (courseId, instructorId, role, data) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw { statusCode: 404, message: '강의를 찾을 수 없습니다.' };
  if (course.instructorId !== instructorId && role !== 'ADMIN') {
    throw { statusCode: 403, message: '수정 권한이 없습니다.' };
  }

  const { tags, ...courseData } = data;

  if (tags) {
    await prisma.courseTag.deleteMany({ where: { courseId } });
  }

  return prisma.course.update({
    where: { id: courseId },
    data: {
      ...courseData,
      tags: tags ? {
        create: tags.map((tagName) => ({
          tag: { connectOrCreate: { where: { name: tagName }, create: { name: tagName } } },
        })),
      } : undefined,
    },
    select: courseSelect,
  });
};

export const deleteCourse = async (courseId, instructorId, role) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw { statusCode: 404, message: '강의를 찾을 수 없습니다.' };
  if (course.instructorId !== instructorId && role !== 'ADMIN') {
    throw { statusCode: 403, message: '삭제 권한이 없습니다.' };
  }
  await prisma.course.delete({ where: { id: courseId } });
};

export const enrollCourse = async (userId, courseId) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw { statusCode: 404, message: '강의를 찾을 수 없습니다.' };

  if (course.price > 0) {
    const payment = await prisma.payment.findFirst({
      where: { userId, courseId, status: 'COMPLETED' },
    });
    if (!payment) throw { statusCode: 403, message: '결제 후 수강 가능합니다.' };
  }

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) throw { statusCode: 409, message: '이미 수강 중인 강의입니다.' };

  return prisma.enrollment.create({ data: { userId, courseId } });
};

export const createSection = async (courseId, instructorId, role, data) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw { statusCode: 404, message: '강의를 찾을 수 없습니다.' };
  if (course.instructorId !== instructorId && role !== 'ADMIN') {
    throw { statusCode: 403, message: '권한이 없습니다.' };
  }

  const lastSection = await prisma.section.findFirst({
    where: { courseId }, orderBy: { order: 'desc' },
  });

  return prisma.section.create({
    data: { ...data, courseId, order: (lastSection?.order ?? 0) + 1 },
  });
};

export const createReview = async (userId, courseId, { rating, content }) => {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) throw { statusCode: 403, message: '수강 후 리뷰를 작성할 수 있습니다.' };

  return prisma.review.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId, rating, content },
    update: { rating, content },
  });
};

export const getInstructorCourses = async (instructorId) => {
  return prisma.course.findMany({
    where: { instructorId },
    select: {
      ...courseSelect,
      status: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};
