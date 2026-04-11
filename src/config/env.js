const required = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`환경변수 ${key} 가 설정되지 않았습니다.`);
  return value;
};

const optional = (key, defaultValue = '') => process.env[key] ?? defaultValue;

export const env = {
  PORT: parseInt(optional('PORT', '3000')),
  NODE_ENV: optional('NODE_ENV', 'development'),
  isDev: optional('NODE_ENV', 'development') === 'development',

  DATABASE_URL: required('DATABASE_URL'),

  JWT_SECRET: required('JWT_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '7d'),

  SMTP_HOST: optional('SMTP_HOST', 'smtp.gmail.com'),
  SMTP_PORT: parseInt(optional('SMTP_PORT', '587')),
  SMTP_USER: optional('SMTP_USER'),
  SMTP_PASS: optional('SMTP_PASS'),
  FROM_EMAIL: optional('FROM_EMAIL', 'noreply@codingedu.com'),

  AWS_ACCESS_KEY_ID: optional('AWS_ACCESS_KEY_ID'),
  AWS_SECRET_ACCESS_KEY: optional('AWS_SECRET_ACCESS_KEY'),
  AWS_REGION: optional('AWS_REGION', 'ap-northeast-2'),
  AWS_S3_BUCKET: optional('AWS_S3_BUCKET'),

  JUDGE0_URL: optional('JUDGE0_URL', 'http://localhost:2358'),
  JUDGE0_API_KEY: optional('JUDGE0_API_KEY'),

  TOSS_SECRET_KEY: optional('TOSS_SECRET_KEY'),
  TOSS_CLIENT_KEY: optional('TOSS_CLIENT_KEY'),

  GOOGLE_CLIENT_ID: optional('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: optional('GOOGLE_CLIENT_SECRET'),
  GITHUB_CLIENT_ID: optional('GITHUB_CLIENT_ID'),
  GITHUB_CLIENT_SECRET: optional('GITHUB_CLIENT_SECRET'),

  FRONTEND_URL: optional('FRONTEND_URL', 'http://localhost:3001'),
};
