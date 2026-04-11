import { createHmac, randomBytes } from 'crypto';
import { env } from '../config/env.js';
import prisma from '../config/database.js';

// fastify jwt를 통해 토큰 생성/검증은 app에서 처리
// 여기서는 refresh token 관련 유틸만 관리

export const generateRefreshToken = () => randomBytes(64).toString('hex');

export const saveRefreshToken = async (userId, token) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7일

  await prisma.refreshToken.create({
    data: { userId, token, expiresAt },
  });
};

export const verifyRefreshToken = async (token) => {
  const record = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record) throw new Error('유효하지 않은 토큰입니다.');
  if (record.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { token } });
    throw new Error('만료된 토큰입니다.');
  }

  return record.user;
};

export const deleteRefreshToken = async (token) => {
  await prisma.refreshToken.deleteMany({ where: { token } });
};

export const deleteAllUserTokens = async (userId) => {
  await prisma.refreshToken.deleteMany({ where: { userId } });
};
