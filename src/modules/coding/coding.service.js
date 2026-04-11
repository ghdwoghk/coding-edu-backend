import axios from 'axios';
import prisma from '../../config/database.js';
import { env } from '../../config/env.js';

// Judge0 언어 ID 매핑
const LANGUAGE_IDS = {
  javascript: 63,  // Node.js
  python: 71,      // Python 3
  java: 62,        // Java
  cpp: 54,         // C++ 14
  c: 50,           // C
  typescript: 74,  // TypeScript
  go: 60,          // Go
  rust: 73,        // Rust
};

const judge0Headers = {
  'Content-Type': 'application/json',
  ...(env.JUDGE0_API_KEY && { 'X-Auth-Token': env.JUDGE0_API_KEY }),
};

const executeCode = async (code, language, stdin = '') => {
  const languageId = LANGUAGE_IDS[language];
  if (!languageId) throw { statusCode: 400, message: '지원하지 않는 언어입니다.' };

  const submitRes = await axios.post(
    `${env.JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
    { source_code: code, language_id: languageId, stdin },
    { headers: judge0Headers, timeout: 30000 }
  );

  return submitRes.data;
};

export const runCode = async (userId, { problemId, code, language }) => {
  const problem = await prisma.codingProblem.findUnique({
    where: { id: problemId },
    include: { testCases: { where: { isHidden: false } } },
  });
  if (!problem) throw { statusCode: 404, message: '문제를 찾을 수 없습니다.' };

  const results = await Promise.all(
    problem.testCases.map(async (tc) => {
      const result = await executeCode(code, language, tc.input);
      const actual = (result.stdout ?? '').trim();
      const expected = tc.expected.trim();
      return {
        testCaseId: tc.id,
        input: tc.input,
        expected,
        actual,
        passed: actual === expected,
        status: result.status?.description,
        time: result.time,
        memory: result.memory,
      };
    })
  );

  return { results, allPassed: results.every((r) => r.passed) };
};

export const submitCode = async (userId, { problemId, code, language }) => {
  const problem = await prisma.codingProblem.findUnique({
    where: { id: problemId },
    include: { testCases: true },
  });
  if (!problem) throw { statusCode: 404, message: '문제를 찾을 수 없습니다.' };

  const submission = await prisma.submission.create({
    data: { userId, problemId, code, language, status: 'PENDING' },
  });

  // 모든 테스트케이스 실행
  const results = await Promise.all(
    problem.testCases.map(async (tc) => {
      const result = await executeCode(code, language, tc.input);
      const actual = (result.stdout ?? '').trim();
      return {
        testCaseId: tc.id,
        passed: actual === tc.expected.trim(),
        status: result.status?.id,
        statusDesc: result.status?.description,
        time: result.time,
        memory: result.memory,
      };
    })
  );

  // 상태 결정
  let status = 'ACCEPTED';
  for (const r of results) {
    if (r.status === 5) { status = 'TIME_LIMIT_EXCEEDED'; break; }
    if (r.status === 6) { status = 'COMPILE_ERROR'; break; }
    if (r.status >= 7 && r.status <= 12) { status = 'RUNTIME_ERROR'; break; }
    if (!r.passed) { status = 'WRONG_ANSWER'; break; }
  }

  const updated = await prisma.submission.update({
    where: { id: submission.id },
    data: { status, result: results },
  });

  return updated;
};

export const getSubmissions = async (userId, problemId) => {
  return prisma.submission.findMany({
    where: { userId, problemId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
};
