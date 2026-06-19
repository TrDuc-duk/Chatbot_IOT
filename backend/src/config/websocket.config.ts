import { registerAs } from '@nestjs/config';

export default registerAs('websocket', () => ({
  cors: {
    origin: '*', // Production: đổi thành domain cụ thể
    credentials: true,
  },
  // Timeout cho command (ms)
  commandTimeout: 10000, // 10 giây
}));
