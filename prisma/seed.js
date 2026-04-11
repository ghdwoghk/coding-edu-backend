import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('시드 데이터 생성 중...');

  // 관리자 계정
  const adminPassword = await bcrypt.hash('admin1234!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@codingedu.com' },
    update: {},
    create: {
      email: 'admin@codingedu.com',
      password: adminPassword,
      name: '관리자',
      nickname: 'admin',
      role: 'ADMIN',
      emailVerified: true,
    },
  });

  // 강사 계정
  const instructorPassword = await bcrypt.hash('instructor1234!', 12);
  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@codingedu.com' },
    update: {},
    create: {
      email: 'instructor@codingedu.com',
      password: instructorPassword,
      name: '김강사',
      nickname: 'instructor_kim',
      role: 'INSTRUCTOR',
      emailVerified: true,
      bio: 'JavaScript & Node.js 전문 강사',
    },
  });

  // 학생 계정
  const studentPassword = await bcrypt.hash('student1234!', 12);
  const student = await prisma.user.upsert({
    where: { email: 'student@codingedu.com' },
    update: {},
    create: {
      email: 'student@codingedu.com',
      password: studentPassword,
      name: '이학생',
      nickname: 'student_lee',
      role: 'STUDENT',
      emailVerified: true,
    },
  });

  // 태그
  const tags = await Promise.all(
    ['JavaScript', 'Python', 'React', 'Node.js', 'TypeScript', 'Algorithm'].map((name) =>
      prisma.tag.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  // 샘플 강의
  const course = await prisma.course.upsert({
    where: { id: 'sample-course-001' },
    update: {},
    create: {
      id: 'sample-course-001',
      title: 'JavaScript 완전 정복',
      description: '자바스크립트의 기초부터 심화까지 배우는 완전 정복 과정입니다.',
      price: 49000,
      level: 'BEGINNER',
      status: 'PUBLISHED',
      instructorId: instructor.id,
      tags: {
        create: [
          { tag: { connect: { name: 'JavaScript' } } },
          { tag: { connect: { name: 'Node.js' } } },
        ],
      },
    },
  });

  // 섹션 → 챕터 → 강의
  const section = await prisma.section.upsert({
    where: { id: 'sample-section-001' },
    update: {},
    create: {
      id: 'sample-section-001',
      title: '1. JavaScript 기초',
      order: 1,
      courseId: course.id,
    },
  });

  const chapter = await prisma.chapter.upsert({
    where: { id: 'sample-chapter-001' },
    update: {},
    create: {
      id: 'sample-chapter-001',
      title: '변수와 타입',
      order: 1,
      sectionId: section.id,
    },
  });

  const lesson = await prisma.lesson.upsert({
    where: { id: 'sample-lesson-001' },
    update: {},
    create: {
      id: 'sample-lesson-001',
      title: '변수 선언 (var, let, const)',
      type: 'VIDEO',
      order: 1,
      isFree: true,
      chapterId: chapter.id,
    },
  });

  await prisma.videoLesson.upsert({
    where: { lessonId: lesson.id },
    update: {},
    create: {
      lessonId: lesson.id,
      videoUrl: 'https://example.com/videos/lesson-001.mp4',
      duration: 600,
    },
  });

  // 쿠폰
  await prisma.coupon.upsert({
    where: { code: 'WELCOME50' },
    update: {},
    create: {
      code: 'WELCOME50',
      discountType: 'PERCENT',
      discount: 50,
      maxUses: 100,
    },
  });

  console.log('시드 완료!');
  console.log('계정 정보:');
  console.log('  관리자: admin@codingedu.com / admin1234!');
  console.log('  강사:   instructor@codingedu.com / instructor1234!');
  console.log('  학생:   student@codingedu.com / student1234!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
