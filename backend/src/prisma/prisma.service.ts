import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService - Service quản lý kết nối database
 *
 * Extends PrismaClient để:
 * - Tự động kết nối khi module khởi tạo
 * - Tự động đóng kết nối khi app shutdown
 * - Log các query trong development mode
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      // Log các query trong development để debug
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }

  /**
   * Được gọi khi module khởi tạo
   * Kết nối tới database
   */
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');
    } catch (error) {
      this.logger.error('❌ Database connection failed', error);
      throw error;
    }
  }

  /**
   * Được gọi khi app shutdown
   * Đóng kết nối database để tránh connection leak
   */
  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Helper method để xóa tất cả data (dùng cho testing)
   * ⚠️ CHỈ DÙNG TRONG DEVELOPMENT/TESTING
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production! ');
    }

    // Xóa theo thứ tự để tránh lỗi foreign key
    await this.schedule.deleteMany();
    await this.irrigationLog.deleteMany();
    await this.irrigation.deleteMany();
    await this.sensorLog.deleteMany();
    await this.garden.deleteMany();
    await this.device.deleteMany();
    await this.plant.deleteMany();
    await this.user.deleteMany();
    await this.role.deleteMany();

    this.logger.warn('🗑️ Database cleaned');
  }
}
