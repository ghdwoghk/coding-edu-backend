import * as paymentService from './payment.service.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';

export const paymentRoutes = async (fastify) => {
  // 결제 시작
  fastify.post('/initiate', {
    preHandler: authenticate,
    schema: {
      tags: ['Payment'],
      body: {
        type: 'object',
        required: ['courseId'],
        properties: {
          courseId: { type: 'string' },
          couponCode: { type: 'string' },
        },
      },
    },
  }, async (req) => {
    return paymentService.initiatePayment(req.user.id, req.body);
  });

  // 결제 확인 (Toss 콜백)
  fastify.post('/confirm', {
    schema: {
      tags: ['Payment'],
      body: {
        type: 'object',
        required: ['orderId', 'paymentKey', 'amount'],
        properties: {
          orderId: { type: 'string' },
          paymentKey: { type: 'string' },
          amount: { type: 'integer' },
        },
      },
    },
  }, async (req) => {
    return paymentService.confirmPayment(req.body);
  });

  // 환불 요청
  fastify.post('/refund', {
    preHandler: authenticate,
    schema: {
      tags: ['Payment'],
      body: {
        type: 'object',
        required: ['orderId'],
        properties: {
          orderId: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
  }, async (req) => {
    return paymentService.refundPayment(req.user.id, req.user.role, req.body.orderId, req.body.reason);
  });

  // 내 결제 내역
  fastify.get('/my', { preHandler: authenticate }, async (req) => {
    return paymentService.getMyPayments(req.user.id);
  });

  // 쿠폰 생성 (관리자)
  fastify.post('/coupons', {
    preHandler: authorize('ADMIN'),
    schema: {
      tags: ['Payment'],
      body: {
        type: 'object',
        required: ['code', 'discountType', 'discount'],
        properties: {
          code: { type: 'string' },
          discountType: { type: 'string', enum: ['PERCENT', 'FIXED'] },
          discount: { type: 'integer' },
          maxUses: { type: 'integer' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  }, async (req, reply) => {
    const coupon = await paymentService.createCoupon(req.body);
    return reply.status(201).send(coupon);
  });

  // 결제 통계 (관리자)
  fastify.get('/admin/stats', {
    preHandler: authorize('ADMIN'),
  }, async () => {
    return paymentService.getAdminStats();
  });
};
