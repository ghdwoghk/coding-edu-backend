import prisma from '../../config/database.js';

const checkAccess = async (lessonId, userId, role) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      chapter: { include: { section: { include: { course: true } } } },
    },
  });
  if (!lesson) throw { statusCode: 404, message: '강의를 찾을 수 없습니다.' };

  if (lesson.isFree || role === 'ADMIN') return lesson;

  const courseId = lesson.chapter.section.courseId;
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) throw { statusCode: 403, message: '수강 신청 후 이용 가능합니다.' };

  return lesson;
};

export const getLesson = async (lessonId, userId, role) => {
  const lesson = await checkAccess(lessonId, userId, role);

  let content = null;
  if (lesson.type === 'VIDEO') {
    content = await prisma.videoLesson.findUnique({ where: { lessonId } });
  } else if (lesson.type === 'TEXT') {
    content = await prisma.textLesson.findUnique({ where: { lessonId } });
  } else if (lesson.type === 'CODING') {
    content = await prisma.codingProblem.findUnique({
      where: { lessonId },
      include: { testCases: { where: { isHidden: false } } },
    });
  } else if (lesson.type === 'QUIZ') {
    content = await prisma.quiz.findUnique({
      where: { lessonId },
      include: { questions: { include: { answers: true }, orderBy: { order: 'asc' } } },
    });
  }

  return { ...lesson, content };
};

export const createLesson = async (chapterId, instructorId, role, data) => {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { section: { include: { course: true } } },
  });
  if (!chapter) throw { statusCode: 404, message: '챕터를 찾을 수 없습니다.' };
  if (chapter.section.course.instructorId !== instructorId && role !== 'ADMIN') {
    throw { statusCode: 403, message: '권한이 없습니다.' };
  }

  const lastLesson = await prisma.lesson.findFirst({
    where: { chapterId }, orderBy: { order: 'desc' },
  });

  const { type, content, ...lessonData } = data;

  const lesson = await prisma.lesson.create({
    data: { ...lessonData, type, chapterId, order: (lastLesson?.order ?? 0) + 1 },
  });

  if (content) {
    if (type === 'VIDEO') {
      await prisma.videoLesson.create({ data: { ...content, lessonId: lesson.id } });
    } else if (type === 'TEXT') {
      await prisma.textLesson.create({ data: { ...content, lessonId: lesson.id } });
    } else if (type === 'CODING') {
      const { testCases, ...problemData } = content;
      await prisma.codingProblem.create({
        data: {
          ...problemData, lessonId: lesson.id,
          testCases: testCases ? { create: testCases } : undefined,
        },
      });
    } else if (type === 'QUIZ') {
      const { questions, ...quizData } = content;
      await prisma.quiz.create({
        data: {
          lessonId: lesson.id,
          questions: questions ? {
            create: questions.map((q, i) => ({
              question: q.question, order: i,
              answers: { create: q.answers },
            })),
          } : undefined,
        },
      });
    }
  }

  return lesson;
};

export const createChapter = async (sectionId, instructorId, role, data) => {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { course: true },
  });
  if (!section) throw { statusCode: 404, message: '섹션을 찾을 수 없습니다.' };
  if (section.course.instructorId !== instructorId && role !== 'ADMIN') {
    throw { statusCode: 403, message: '권한이 없습니다.' };
  }

  const lastChapter = await prisma.chapter.findFirst({
    where: { sectionId }, orderBy: { order: 'desc' },
  });

  return prisma.chapter.create({
    data: { ...data, sectionId, order: (lastChapter?.order ?? 0) + 1 },
  });
};
