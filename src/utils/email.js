import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

const send = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"코딩에듀" <${env.FROM_EMAIL}>`,
    to,
    subject,
    html,
  });
};

export const sendVerificationEmail = async (to, token) => {
  const url = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  await send({
    to,
    subject: '[코딩에듀] 이메일 인증',
    html: `
      <h2>이메일 인증</h2>
      <p>아래 버튼을 클릭하여 이메일을 인증해 주세요.</p>
      <a href="${url}" style="background:#4F46E5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">이메일 인증하기</a>
      <p>링크는 24시간 후 만료됩니다.</p>
    `,
  });
};

export const sendPasswordResetEmail = async (to, token) => {
  const url = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  await send({
    to,
    subject: '[코딩에듀] 비밀번호 재설정',
    html: `
      <h2>비밀번호 재설정</h2>
      <p>아래 버튼을 클릭하여 비밀번호를 재설정해 주세요.</p>
      <a href="${url}" style="background:#4F46E5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">비밀번호 재설정</a>
      <p>링크는 1시간 후 만료됩니다.</p>
    `,
  });
};

export const sendCourseEnrollmentEmail = async (to, courseName) => {
  await send({
    to,
    subject: `[코딩에듀] "${courseName}" 수강 신청 완료`,
    html: `
      <h2>수강 신청 완료</h2>
      <p><strong>${courseName}</strong> 강의를 수강하게 되셨습니다. 열심히 공부하세요!</p>
      <a href="${env.FRONTEND_URL}/my/courses" style="background:#4F46E5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">내 강의 보기</a>
    `,
  });
};

export const sendCertificateEmail = async (to, courseName) => {
  await send({
    to,
    subject: `[코딩에듀] "${courseName}" 수료증 발급`,
    html: `
      <h2>수료 축하드립니다!</h2>
      <p><strong>${courseName}</strong> 과정을 완료하셨습니다.</p>
      <a href="${env.FRONTEND_URL}/my/certificates" style="background:#4F46E5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">수료증 확인하기</a>
    `,
  });
};
