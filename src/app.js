import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';

import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import swaggerPlugin from './plugins/swagger.js';

import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { coursesRoutes } from './modules/courses/courses.routes.js';
import { lessonsRoutes } from './modules/lessons/lessons.routes.js';
import { codingRoutes } from './modules/coding/coding.routes.js';
import { progressRoutes } from './modules/progress/progress.routes.js';
import { quizRoutes } from './modules/quiz/quiz.routes.js';
import { communityRoutes } from './modules/community/community.routes.js';
import { paymentRoutes } from './modules/payment/payment.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { searchRoutes } from './modules/search/search.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';

const fastify = Fastify({
  logger: {
    level: env.isDev ? 'info' : 'warn',
    transport: env.isDev
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});

// 플러그인 등록
await fastify.register(cors, {
  origin: env.FRONTEND_URL,
  credentials: true,
});

await fastify.register(jwt, {
  secret: env.JWT_SECRET,
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

await fastify.register(multipart, {
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

await fastify.register(swaggerPlugin);

// 에러 핸들러
fastify.setErrorHandler(errorHandler);

// 라우트 등록
const API = '/api/v1';
await fastify.register(authRoutes,          { prefix: `${API}/auth` });
await fastify.register(usersRoutes,         { prefix: `${API}/users` });
await fastify.register(coursesRoutes,       { prefix: `${API}/courses` });
await fastify.register(lessonsRoutes,       { prefix: `${API}/lessons` });
await fastify.register(codingRoutes,        { prefix: `${API}/coding` });
await fastify.register(progressRoutes,      { prefix: `${API}/progress` });
await fastify.register(quizRoutes,          { prefix: `${API}/quizzes` });
await fastify.register(communityRoutes,     { prefix: `${API}/community` });
await fastify.register(paymentRoutes,       { prefix: `${API}/payments` });
await fastify.register(notificationsRoutes, { prefix: `${API}/notifications` });
await fastify.register(searchRoutes,        { prefix: `${API}/search` });
await fastify.register(adminRoutes,         { prefix: `${API}/admin` });

// 헬스체크
fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// 서버 시작
try {
  await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(`서버 실행 중: http://localhost:${env.PORT}`);
  console.log(`API 문서: http://localhost:${env.PORT}/docs`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
