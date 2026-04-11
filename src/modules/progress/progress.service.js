import prisma from '../../config/database.js';
import { sendCertificateEmail } from '../../utils/email.js';
import { generateCertificatePDF } from '../../utils/certificate.js';

export const markLessonComplete = async (userId, lessonId) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      chapter: {
        include: { section: { include: { course: { include: { sections: { include: { chapters: { include: { lessons: true } } } } } } } } },
      },
    },
  });
  if (!lesson) throw { statusCode: 404, message: '강의를 찾을 수 없습니다.' };

  const progress = await prisma.progress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, completed: true, completedAt: new Date() },
    update: { completed: true, completedAt: new Date() },
  });

  // 전체 완료 여부 체크 → 수료증 발급
  const course = lesson.chapter.section.course;
  const allLessons = course.sections
    .flatMap((s) => s.chapters)
    .flatMap((c) => c.lessons);

  const completedCount = await prisma.progress.count({
    where: { userId, lessonId: { in: allLessons.map((l) => l.id) }, completed: true },
  });

  if (completedCount === allLessons.length) {
    const existing = await prisma.certificate.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    });
    if (!existing) {
      const cert = await prisma.certificate.create({
        data: { userId, courseId: course.id },
        include: { user: true, course: true },
      });

      // 알림 생성
      await prisma.notification.create({
        data: {
          userId,
          title: '수료증 발급',
          message: `"${course.title}" 과정을 완료하여 수료증이 발급되었습니다.`,
          type: 'CERTIFICATE',
        },
      });

      await sendCertificateEmail(cert.user.email, course.title).catch(() => {});
    }
  }

  return progress;
};

export const getCourseProgress = async (userId, courseId) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sections: {
        include: { chapters: { include: { lessons: true } } },
      },
    },
  });
  if (!course) throw { statusCode: 404, message: '강의를 찾을 수 없습니다.' };

  const allLessons = course.sections
    .flatMap((s) => s.chapters)
    .flatMap((c) => c.lessons);

  const completedProgresses = await prisma.progress.findMany({
    where: {
      userId,
      lessonId: { in: allLessons.map((l) => l.id) },
      completed: true,
    },
  });

  const completedIds = new Set(completedProgresses.map((p) => p.lessonId));

  return {
    total: allLessons.length,
    completed: completedProgresses.length,
    percentage: allLessons.length > 0
      ? Math.round((completedProgresses.length / allLessons.length) * 100)
      : 0,
    sections: course.sections.map((section) => ({
      id: section.id,
      title: section.title,
      chapters: section.chapters.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        lessons: chapter.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          type: lesson.type,
          completed: completedIds.has(lesson.id),
        })),
      })),
    })),
  };
};

export const getCertificatePDF = async (userId, courseId) => {
  const cert = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
    include: { user: true, course: true },
  });
  if (!cert) throw { statusCode: 404, message: '수료증을 찾을 수 없습니다.' };

  return generateCertificatePDF(cert.user.name, cert.course.title, cert.issuedAt);
};
