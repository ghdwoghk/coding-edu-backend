import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import prisma from '../../config/database.js';
import {
  generateRefreshToken,
  saveRefreshToken,
  verifyRefreshToken,
  deleteRefreshToken,
  deleteAllUserTokens,
} from '../../utils/jwt.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../utils/email.js';

export const register = async ({ email, password, name }) => {
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw { statusCode: 409, message: '이미 사용 중인 이메일입니다.' };

  const hashed = await bcrypt.hash(password, 12);
  const verifyToken = randomBytes(32).toString('hex');

  const user = await prisma.user.create({
    data: { email, password: hashed, name },
  });

  await sendVerificationEmail(email, verifyToken).catch(() => {});

  return { id: user.id, email: user.email, name: user.name };
};

export const login = async ({ email, password }, fastify) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    throw { statusCode: 401, message: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw { statusCode: 401, message: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  }

  const accessToken = fastify.jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    { expiresIn: '15m' }
  );

  const refreshToken = generateRefreshToken();
  await saveRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
};

export const refresh = async (token, fastify) => {
  const user = await verifyRefreshToken(token);
  await deleteRefreshToken(token);

  const accessToken = fastify.jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    { expiresIn: '15m' }
  );

  const newRefreshToken = generateRefreshToken();
  await saveRefreshToken(user.id, newRefreshToken);

  return { accessToken, refreshToken: newRefreshToken };
};

export const logout = async (refreshToken) => {
  await deleteRefreshToken(refreshToken);
};

export const requestPasswordReset = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // 보안상 이메일 존재 여부 노출 안함

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 3600 * 1000); // 1시간

  await prisma.refreshToken.create({
    data: { token: `reset:${token}`, userId: user.id, expiresAt },
  });

  await sendPasswordResetEmail(email, token);
};

export const resetPassword = async (token, newPassword) => {
  const record = await prisma.refreshToken.findUnique({
    where: { token: `reset:${token}` },
  });

  if (!record || record.expiresAt < new Date()) {
    throw { statusCode: 400, message: '유효하지 않거나 만료된 토큰입니다.' };
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: record.userId },
    data: { password: hashed },
  });

  await prisma.refreshToken.delete({ where: { token: `reset:${token}` } });
  await deleteAllUserTokens(record.userId);
};

export const oauthLogin = async ({ provider, providerId, email, name, avatar }, fastify) => {
  let user;
  const oauth = await prisma.oAuthAccount.findUnique({
    where: { provider_providerId: { provider, providerId } },
    include: { user: true },
  });

  if (oauth) {
    user = oauth.user;
  } else {
    user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, name, avatar, emailVerified: true },
      });
    }
    await prisma.oAuthAccount.create({
      data: { provider, providerId, userId: user.id },
    });
  }

  const accessToken = fastify.jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    { expiresIn: '15m' }
  );
  const refreshToken = generateRefreshToken();
  await saveRefreshToken(user.id, refreshToken);

  return { accessToken, refreshToken, user };
};
