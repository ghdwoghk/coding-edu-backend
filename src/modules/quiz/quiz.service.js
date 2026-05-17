import prisma from '../../config/database.js';

export const submitQuiz = async (userId, quizId, answers) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { include: { answers: true } } },
  });
  if (!quiz) throw { statusCode: 404, message: '퀴즈를 찾을 수 없습니다.' };

  let correctCount = 0;
  const result = quiz.questions.map((question) => {
    const userAnswer = answers[question.id];
    const correctAnswer = question.answers.find((a) => a.isCorrect);
    const isCorrect = userAnswer === correctAnswer?.id;
    if (isCorrect) correctCount++;

    return {
      questionId: question.id,
      question: question.question,
      userAnswerId: userAnswer,
      correctAnswerId: correctAnswer?.id,
      isCorrect,
    };
  });

  const score = Math.round((correctCount / quiz.questions.length) * 100);

  const attempt = await prisma.quizAttempt.create({
    data: { userId, quizId, score, answers: result },
  });

  return { attemptId: attempt.id, score, correctCount, total: quiz.questions.length, result };
};

export const getQuizAttempts = async (userId, quizId) => {
  return prisma.quizAttempt.findMany({
    where: { userId, quizId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
};

export const getAssignments = async (courseId) => {
  return prisma.assignment.findMany({
    where: { courseId },
    orderBy: { createdAt: 'asc' },
  });
};

export const submitAssignment = async (userId, assignmentId, data) => {
  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw { statusCode: 404, message: '과제를 찾을 수 없습니다.' };

  return prisma.assignmentSubmission.upsert({
    where: { assignmentId_userId: { assignmentId, userId } },
    create: { assignmentId, userId, ...data },
    update: data,
  });
};

export const gradeAssignment = async (submissionId, instructorId, role, { score, feedback }) => {
  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: { assignment: { include: { course: true } } },
  });
  if (!submission) throw { statusCode: 404, message: '제출물을 찾을 수 없습니다.' };
  if (submission.assignment.course.instructorId !== instructorId && role !== 'ADMIN') {
    throw { statusCode: 403, message: '채점 권한이 없습니다.' };
  }

  return prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: { score, feedback },
  });
};
