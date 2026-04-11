import * as authService from './auth.service.js';
import axios from 'axios';
import { env } from '../../config/env.js';

export const register = async (request, reply) => {
  const user = await authService.register(request.body);
  return reply.status(201).send({ message: '회원가입 완료. 이메일을 인증해주세요.', user });
};

export const login = async (request, reply) => {
  const result = await authService.login(request.body, request.server);
  return reply.send(result);
};

export const refresh = async (request, reply) => {
  const { refreshToken } = request.body;
  const result = await authService.refresh(refreshToken, request.server);
  return reply.send(result);
};

export const logout = async (request, reply) => {
  const { refreshToken } = request.body;
  await authService.logout(refreshToken);
  return reply.send({ message: '로그아웃 되었습니다.' });
};

export const forgotPassword = async (request, reply) => {
  await authService.requestPasswordReset(request.body.email);
  return reply.send({ message: '비밀번호 재설정 이메일을 전송했습니다.' });
};

export const resetPassword = async (request, reply) => {
  const { token, password } = request.body;
  await authService.resetPassword(token, password);
  return reply.send({ message: '비밀번호가 변경되었습니다.' });
};

export const googleCallback = async (request, reply) => {
  const { code } = request.query;

  const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: `${env.FRONTEND_URL}/auth/google/callback`,
    grant_type: 'authorization_code',
  });

  const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
  });

  const { id, email, name, picture } = userRes.data;
  const result = await authService.oauthLogin(
    { provider: 'google', providerId: id, email, name, avatar: picture },
    request.server
  );

  return reply.send(result);
};

export const githubCallback = async (request, reply) => {
  const { code } = request.query;

  const tokenRes = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    },
    { headers: { Accept: 'application/json' } }
  );

  const userRes = await axios.get('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
  });

  const emailRes = await axios.get('https://api.github.com/user/emails', {
    headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
  });

  const primaryEmail = emailRes.data.find((e) => e.primary)?.email;
  const { id, login, avatar_url } = userRes.data;

  const result = await authService.oauthLogin(
    { provider: 'github', providerId: String(id), email: primaryEmail, name: login, avatar: avatar_url },
    request.server
  );

  return reply.send(result);
};
