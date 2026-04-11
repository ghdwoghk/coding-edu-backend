import prisma from '../../config/database.js';

export const getNotifications = async (userId, { page = 1, limit = 20, unreadOnly }) => {
  const where = {
    userId,
    ...(unreadOnly && { read: false }),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  return { notifications, total, unreadCount, page, limit };
};

export const markAsRead = async (userId, notificationId) => {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.userId !== userId) {
    throw { statusCode: 404, message: '알림을 찾을 수 없습니다.' };
  }
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
};

export const markAllAsRead = async (userId) => {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return { message: '모든 알림을 읽음 처리했습니다.' };
};

export const deleteNotification = async (userId, notificationId) => {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.userId !== userId) {
    throw { statusCode: 404, message: '알림을 찾을 수 없습니다.' };
  }
  await prisma.notification.delete({ where: { id: notificationId } });
};
