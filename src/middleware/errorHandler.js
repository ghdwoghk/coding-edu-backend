export const errorHandler = (error, request, reply) => {
  const { log } = request.server;

  // Prisma 에러 처리
  if (error.code === 'P2002') {
    return reply.status(409).send({
      statusCode: 409,
      error: 'Conflict',
      message: '이미 존재하는 데이터입니다.',
    });
  }

  if (error.code === 'P2025') {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: '데이터를 찾을 수 없습니다.',
    });
  }

  // JWT 에러
  if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: '인증이 필요합니다.',
    });
  }

  if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: '토큰이 만료되었습니다.',
    });
  }

  // 검증 에러
  if (error.validation) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: '입력값이 올바르지 않습니다.',
      details: error.validation,
    });
  }

  // 커스텀 에러
  if (error.statusCode) {
    return reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      error: error.error || 'Error',
      message: error.message,
    });
  }

  log.error(error);
  return reply.status(500).send({
    statusCode: 500,
    error: 'Internal Server Error',
    message: '서버 오류가 발생했습니다.',
  });
};
