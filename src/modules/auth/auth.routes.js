import * as authController from './auth.controller.js';

export const authRoutes = async (fastify) => {
  fastify.post('/register', {
    schema: {
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string', minLength: 2 },
        },
      },
    },
    handler: authController.register,
  });

  fastify.post('/login', {
    schema: {
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
    },
    handler: authController.login,
  });

  fastify.post('/refresh', {
    schema: {
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      },
    },
    handler: authController.refresh,
  });

  fastify.post('/logout', {
    schema: {
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      },
    },
    handler: authController.logout,
  });

  fastify.post('/forgot-password', {
    schema: {
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email' } },
      },
    },
    handler: authController.forgotPassword,
  });

  fastify.post('/reset-password', {
    schema: {
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token: { type: 'string' },
          password: { type: 'string', minLength: 8 },
        },
      },
    },
    handler: authController.resetPassword,
  });

  fastify.get('/oauth/google/callback', {
    schema: { tags: ['Auth'] },
    handler: authController.googleCallback,
  });

  fastify.get('/oauth/github/callback', {
    schema: { tags: ['Auth'] },
    handler: authController.githubCallback,
  });
};
