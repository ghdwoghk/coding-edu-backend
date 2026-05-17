import bcrypt from 'bcryptjs';
import prisma from '../../config/database.js';

export const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, nickname: true,
      avatar: true, bio: true, role: true, emailVerified: true, createdAt: true,
      _count: { select: { enrollments: true, courses: true, certificates: true } },
    },
  });
  if (!user) throw { statusCode: 404, message: '사용자를 찾을 수 없습니다.' };
  return user;
};

export const updateProfile = async (userId, data) => {
  if (data.nickname) {
    const exists = await prisma.user.findFirst({
      where: { nickname: data.nickname, id: { not: userId } },
    });
    if (exists) throw { statusCode: 409, message: '이미 사용 중인 닉네임입니다.' };
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true, email: true, name: true, nickname: true,
      avatar: true, bio: true, role: true,
    },
  });
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.password) throw { statusCode: 400, message: '소셜 로그인 계정은 비밀번호를 변경할 수 없습니다.' };

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw { statusCode: 401, message: '현재 비밀번호가 올바르지 않습니다.' };

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
};

export const getMyEnrollments = async (userId) => {
  return prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        select: {
          id: true, title: true, thumbnail: true, level: true,
          instructor: { select: { id: true, name: true } },
          _count: { select: { sections: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getMyCertificates = async (userId) => {
  return prisma.certificate.findMany({
    where: { userId },
    include: {
      course: { select: { id: true, title: true, thumbnail: true } },
    },
    orderBy: { issuedAt: 'desc' },
  });
};

export const getMyStats = async (userId) => {
  const [enrollments, completedLessons, certificates, submissions] = await Promise.all([
    prisma.enrollment.count({ where: { userId } }),
    prisma.progress.count({ where: { userId, completed: true } }),
    prisma.certificate.count({ where: { userId } }),
    prisma.submission.count({ where: { userId, status: 'ACCEPTED' } }),
  ]);

  return { enrollments, completedLessons, certificates, acceptedSubmissions: submissions };
};

// 관리자용
export const getAllUsers = async ({ page = 1, limit = 20, search, role }) => {
  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(role && { role }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, email: true, name: true, role: true,
        emailVerified: true, createdAt: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
};
