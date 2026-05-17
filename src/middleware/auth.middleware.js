export const authenticate = async (request, reply) => {
  await request.jwtVerify();
};

export const authorize = (...roles) => {
  return async (request, reply) => {
    await request.jwtVerify();
    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: '접근 권한이 없습니다.',
      });
    }
  };
};

export const optionalAuth = async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch {
    // 인증 실패해도 계속 진행
    request.user = null;
  }
};
