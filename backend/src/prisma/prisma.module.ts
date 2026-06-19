import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * PrismaModule - Module quản lý database
 *
 * @Global() decorator: Module này sẽ available cho toàn bộ app
 * mà không cần import trong từng module khác
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Export để các module khác dùng được
})
export class PrismaModule {}
