import { registerAs } from '@nestjs/config';

/**
 * Database configuration
 * Sử dụng registerAs để nhóm các config liên quan
 *
 * Truy cập: configService.get('database. url')
 */
export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
}));
