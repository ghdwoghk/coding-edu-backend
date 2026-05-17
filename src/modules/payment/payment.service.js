import axios from 'axios';
import { randomBytes } from 'crypto';
import prisma from '../../config/database.js';
import { env } from '../../config/env.js';
import { sendCourseEnrollmentEmail } from '../../utils/email.js';

const tossAuth = Buffer.from(`${env.TOSS_SECRET_KEY}:`).toString('base64');
const tossHeaders = {
  Authorization: `Basic ${tossAuth}`,
  'Content-Type': 'application/json',
};

export const initiatePayment = async (userId, { courseId, couponCode }) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw { statusCode: 404, message: '강의를 찾을 수 없습니다.' };
  if (course.price === 0) throw { statusCode: 400, message: '무료 강의는 결제가 필요 없습니다.' };

  // 이미 수강 중인지 확인
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (enrollment) throw { statusCode: 409, message: '이미 수강 중인 강의입니다.' };

  let amount = course.price;
  let coupon = null;

  if (couponCode) {
    coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
    if (!coupon) throw { statusCode: 404, message: '유효하지 않은 쿠폰입니다.' };
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw { statusCode: 400, message: '만료된 쿠폰입니다.' };
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      throw { statusCode: 400, message: '사용 가능한 쿠폰 수량이 초과되었습니다.' };
    }

    if (coupon.discountType === 'PERCENT') {
      amount = Math.round(amount * (1 - coupon.discount / 100));
    } else {
      amount = Math.max(0, amount - coupon.discount);
    }
  }

  const orderId = `ORDER_${randomBytes(16).toString('hex')}`;

  await prisma.payment.create({
    data: {
      userId, courseId, amount, orderId, status: 'PENDING',
      couponId: coupon?.id,
    },
  });

  return {
    orderId,
    amount,
    orderName: course.title,
    clientKey: env.TOSS_CLIENT_KEY,
  };
};

export const confirmPayment = async ({ orderId, paymentKey, amount }) => {
  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment) throw { statusCode: 404, message: '주문을 찾을 수 없습니다.' };
  if (payment.amount !== amount) throw { statusCode: 400, message: '결제 금액이 일치하지 않습니다.' };

  // Toss Payments 결제 확인
  const tossRes = await axios.post(
    'https://api.tosspayments.com/v1/payments/confirm',
    { orderId, paymentKey, amount },
    { headers: tossHeaders }
  );

  if (tossRes.data.status !== 'DONE') {
    await prisma.payment.update({ where: { orderId }, data: { status: 'FAILED' } });
    throw { statusCode: 400, message: '결제 확인 실패' };
  }

  const updatedPayment = await prisma.payment.update({
    where: { orderId },
    data: { status: 'COMPLETED', paymentKey },
    include: { user: true, course: true, coupon: true },
  });

  // 쿠폰 사용 횟수 증가
  if (updatedPayment.couponId) {
    await prisma.coupon.update({
      where: { id: updatedPayment.couponId },
      data: { usedCount: { increment: 1 } },
    });
  }

  // 자동 수강 신청
  await prisma.enrollment.create({
    data: { userId: updatedPayment.userId, courseId: updatedPayment.courseId },
  });

  // 알림
  await prisma.notification.create({
    data: {
      userId: updatedPayment.userId,
      title: '결제 완료',
      message: `"${updatedPayment.course.title}" 강의 결제가 완료되었습니다.`,
      type: 'PAYMENT',
    },
  });

  await sendCourseEnrollmentEmail(
    updatedPayment.user.email,
    updatedPayment.course.title
  ).catch(() => {});

  return updatedPayment;
};

export const refundPayment = async (userId, role, orderId, reason) => {
  const payment = await prisma.payment.findUnique({
    where: { orderId },
    include: { user: true },
  });
  if (!payment) throw { statusCode: 404, message: '주문을 찾을 수 없습니다.' };
  if (payment.userId !== userId && role !== 'ADMIN') {
    throw { statusCode: 403, message: '환불 권한이 없습니다.' };
  }
  if (payment.status !== 'COMPLETED') {
    throw { statusCode: 400, message: '환불 가능한 결제가 아닙니다.' };
  }

  await axios.post(
    `https://api.tosspayments.com/v1/payments/${payment.paymentKey}/cancel`,
    { cancelReason: reason || '고객 요청' },
    { headers: tossHeaders }
  );

  await prisma.payment.update({ where: { orderId }, data: { status: 'REFUNDED' } });
  await prisma.enrollment.deleteMany({
    where: { userId: payment.userId, courseId: payment.courseId },
  });

  return { message: '환불이 완료되었습니다.' };
};

export const getMyPayments = async (userId) => {
  return prisma.payment.findMany({
    where: { userId },
    include: {
      course: { select: { id: true, title: true, thumbnail: true } },
      coupon: { select: { code: true, discountType: true, discount: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const createCoupon = async (data) => {
  return prisma.coupon.create({ data });
};

export const getAdminStats = async () => {
  const [totalRevenue, totalPayments, recentPayments] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    prisma.payment.count({ where: { status: 'COMPLETED' } }),
    prisma.payment.findMany({
      where: { status: 'COMPLETED' },
      take: 10,
      include: {
        user: { select: { name: true, email: true } },
        course: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    totalRevenue: totalRevenue._sum.amount ?? 0,
    totalPayments,
    recentPayments,
  };
};
