import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8080', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim()),
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
}));

export const redisConfig = registerAs('redis', () => ({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
}));

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
  accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
  refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));

export const mailConfig = registerAs('mail', () => ({
  user: process.env.GMAIL_USER || '',
  pass: process.env.GMAIL_PASS || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
}));
