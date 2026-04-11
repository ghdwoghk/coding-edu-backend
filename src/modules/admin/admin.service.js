import prisma from '../../config/database.js';

export const getDashboard = async () => {
  const [
    totalUsers, totalCourses, totalEnrollments,
    totalRevenue, newUsersToday, newEnrollmentsToday,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.course.count({ where: { status: 'PUBLISHED' } }),
    prisma.enrollment.count(),
    prisma.payment.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    prisma.user.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.enrollment.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
  ]);

  return {
    totalUsers,
    totalCourses,
    totalEnrollments,
    totalRevenue: totalRevenue._sum.amount ?? 0,
    newUsersToday,
    newEnrollmentsToday,
  };
};

export const getPendingCourses = async () => {
  return prisma.course.findMany({
    where: { status: 'PENDING' },
    include: {
      instructor: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const approveCourse = async (courseId) => {
  const course = await prisma.course.update({
    where: { id: courseId },
    data: { status: 'PUBLISHED' },
    include: { instructor: true },
  });

  await prisma.notification.create({
    data: {
      userId: course.instructorId,
      title: '강의 승인',
      message: `"${course.title}" 강의가 승인되었습니다.`,
      type: 'COURSE_APPROVED',
    },
  });

  return course;
};

export const rejectCourse = async (courseId, reason) => {
  const course = await prisma.course.update({
    where: { id: courseId },
    data: { status: 'DRAFT' },
    include: { instructor: true },
  });

  await prisma.notification.create({
    data: {
      userId: course.instructorId,
      title: '강의 반려',
      message: `"${course.title}" 강의가 반려되었습니다. 사유: ${reason}`,
      type: 'COURSE_REJECTED',
    },
  });

  return course;
};

export const updateUserRole = async (userId, role) => {
  return prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, email: true, name: true, role: true },
  });
};

export const getRevenueStats = async ({ from, to }) => {
  const payments = await prisma.payment.findMany({
    where: {
      status: 'COMPLETED',
      createdAt: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      },
    },
    include: {
      course: { select: { title: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // 일별 집계
  const dailyRevenue = payments.reduce((acc, payment) => {
    const date = payment.createdAt.toISOString().split('T')[0];
    acc[date] = (acc[date] ?? 0) + payment.amount;
    return acc;
  }, {});

  return { dailyRevenue, total: payments.reduce((sum, p) => sum + p.amount, 0) };
};
