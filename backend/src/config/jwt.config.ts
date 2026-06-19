import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessSecret:
    process.env.JWT_ACCESS_SECRET || 'default-access-secret-change-me',
  refreshSecret:
    process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-me',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
}));
