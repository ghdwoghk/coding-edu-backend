import * as codingService from './coding.service.js';
import { authenticate } from '../../middleware/auth.middleware.js';

export const codingRoutes = async (fastify) => {
  const codeBody = {
    type: 'object',
    required: ['problemId', 'code', 'language'],
    properties: {
      problemId: { type: 'string' },
      code: { type: 'string' },
      language: { type: 'string', enum: ['javascript', 'python', 'java', 'cpp', 'c', 'typescript', 'go', 'rust'] },
    },
  };

  const runCustomBody = {
    type: 'object',
    required: ['code', 'language'],
    properties: {
      code: { type: 'string' },
      language: { type: 'string', enum: ['javascript', 'python', 'java', 'cpp', 'c', 'typescript', 'go', 'rust'] },
      stdin: { type: 'string' },
    },
  };

  // 코드 실행 (채점 없이 샘플 테스트케이스만)
  fastify.post('/run', {
    // preHandler: authenticate,
    schema: { tags: ['Coding'], body: codeBody },
  }, async (req) => {
    return codingService.runCode('anonymous', req.body);
  });

  // 커스텀 stdin으로 코드 실행 (사용자 입력값 직접 사용)
  fastify.post('/run-custom', {
    schema: { tags: ['Coding'], body: runCustomBody },
  }, async (req) => {
    return codingService.runCodeCustom('anonymous', req.body);
  });

  // 코드 제출 (전체 채점)
  fastify.post('/submit', {
    // preHandler: authenticate,
    schema: { tags: ['Coding'], body: codeBody },
  }, async (req, reply) => {
    const result = await codingService.submitCode('anonymous', req.body);
    return reply.status(201).send(result);
  });

  // 제출 이력
  fastify.get('/submissions/:problemId', {
    // preHandler: authenticate,
    schema: { tags: ['Coding'] },
  }, async (req) => {
    return codingService.getSubmissions('anonymous', req.params.problemId);
  });
};
