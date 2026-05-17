import * as progressService from './progress.service.js';
import { authenticate } from '../../middleware/auth.middleware.js';

export const progressRoutes = async (fastify) => {
  // 강의 완료 처리
  fastify.post('/lessons/:lessonId/complete', {
    preHandler: authenticate,
    schema: { tags: ['Progress'] },
  }, async (req) => {
    return progressService.markLessonComplete(req.user.id, req.params.lessonId);
  });

  // 코스 진도 조회
  fastify.get('/courses/:courseId', {
    preHandler: authenticate,
    schema: { tags: ['Progress'] },
  }, async (req) => {
    return progressService.getCourseProgress(req.user.id, req.params.courseId);
  });

  // 수료증 PDF 다운로드
  fastify.get('/certificates/:courseId/pdf', {
    preHandler: authenticate,
    schema: { tags: ['Progress'] },
  }, async (req, reply) => {
    const pdfBuffer = await progressService.getCertificatePDF(req.user.id, req.params.courseId);
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', 'attachment; filename=certificate.pdf')
      .send(pdfBuffer);
  });
};
