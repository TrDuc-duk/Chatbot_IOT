import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IrrigationLog, IrrigationMode } from '@prisma/client';

@Injectable()
export class IrrigationService implements OnModuleInit {
  private readonly logger = new Logger(IrrigationService.name);

  constructor(private prisma: PrismaService) { }

  async onModuleInit() {
    await this.cleanupStuckLogs();
  }

  /**
   * Cleanup logs bị treo khi server restart
   */
  private async cleanupStuckLogs() {
    this.logger.log('Cleaning up stuck irrigation logs...');

    // Tìm các logs đang started
    const stuckLogs = await this.prisma.irrigationLog.findMany({
      where: { status: 'started' },
    });

    for (const log of stuckLogs) {
      // Kiểm tra xem irrigation có thực sự đang active không
      const irrigation = await this.prisma.irrigation.findUnique({
        where: { gardenId: log.gardenId },
      });

      // Nếu không active hoặc system restart (mặc định là stop hết khi restart để an toàn)
      // Trong trường hợp này, ta assume là nếu server restart thì các process tưới cũ coi như kết thúc/failed
      // Tuy nhiên, nếu ESP32 vẫn đang tưới thì sao? 
      // Backend restart không có nghĩa là ESP32 dừng. 
      // Nhưng để data consistent, ta đánh dấu là 'failed' hoặc 'completed' với note hệ thống.

      await this.prisma.irrigationLog.update({
        where: { id: log.id },
        data: {
          endTime: new Date(),
          status: 'completed',
          note: log.note ? `${log.note} (System Restarted)` : 'System Restarted',
        },
      });

      // Cũng cần reset bảng Irrigation nếu nó đang treo
      if (irrigation?.isActive) {
        await this.prisma.irrigation.update({
          where: { gardenId: log.gardenId },
          data: {
            isActive: false,
            startTime: null,
            mode: null,
          },
        });
      }
    }

    if (stuckLogs.length > 0) {
      this.logger.log(`Cleaned up ${stuckLogs.length} stuck irrigation logs`);
    }
  }

  /**
   * Tạo irrigation log khi bắt đầu tưới
   */
  async startIrrigation(
    gardenId: number,
    mode: IrrigationMode,
    note?: string,
    duration?: number,
  ): Promise<IrrigationLog> {
    // Cập nhật trạng thái irrigation
    await this.prisma.irrigation.upsert({
      where: { gardenId },
      create: {
        gardenId,
        isActive: true,
        startTime: new Date(),
        mode,
      },
      update: {
        isActive: true,
        startTime: new Date(),
        mode,
      },
    });

    // Tạo log
    const log = await this.prisma.irrigationLog.create({
      data: {
        gardenId,
        mode,
        status: 'started',
        note,
        duration, // Lưu duration dự kiến ngay từ đầu
      },
    });

    this.logger.log(`💧 Irrigation started for garden ${gardenId} (${mode})`);

    return log;
  }

  /**
   * Kết thúc irrigation
   */
  async endIrrigation(
    gardenId: number,
    status: 'completed' | 'failed' = 'completed',
    note?: string,
  ): Promise<void> {
    // Lấy irrigation record
    const irrigation = await this.prisma.irrigation.findUnique({
      where: { gardenId },
    });

    if (!irrigation || !irrigation.isActive) {
      return;
    }

    // Tính duration
    const duration = irrigation.startTime
      ? Math.round((Date.now() - irrigation.startTime.getTime()) / 1000)
      : null;

    // Cập nhật trạng thái
    await this.prisma.irrigation.update({
      where: { gardenId },
      data: {
        isActive: false,
        startTime: null,
        mode: null,
      },
    });

    // Cập nhật log cuối cùng
    const lastLog = await this.prisma.irrigationLog.findFirst({
      where: { gardenId, status: 'started' },
      orderBy: { startTime: 'desc' },
    });

    if (lastLog) {
      await this.prisma.irrigationLog.update({
        where: { id: lastLog.id },
        data: {
          endTime: new Date(),
          duration,
          status,
          note: note || lastLog.note,
        },
      });
    }

    this.logger.log(
      `💧 Irrigation ended for garden ${gardenId} (${status}, ${duration}s)`,
    );
  }

  /**
   * Lấy lịch sử tưới của garden
   */
  async getLogsByGarden(
    gardenId: number,
    options?: {
      from?: Date;
      to?: Date;
      limit?: number;
    },
  ): Promise<IrrigationLog[]> {
    const { from, to, limit = 100 } = options || {};

    return this.prisma.irrigationLog.findMany({
      where: {
        gardenId,
        startTime: {
          ...(from && { gte: from }),
          ...(to && { lte: to }),
        },
      },
      orderBy: { startTime: 'desc' },
      take: limit,
    });
  }

  /**
   * Lấy trạng thái tưới hiện tại
   */
  async getCurrentStatus(gardenId: number) {
    return this.prisma.irrigation.findUnique({
      where: { gardenId },
    });
  }

  /**
   * Lấy thống kê tưới
   */
  async getStatistics(
    gardenId: number,
    from: Date,
    to: Date,
  ): Promise<{
    totalIrrigations: number;
    totalDuration: number;
    avgDuration: number;
    byMode: { mode: string; count: number }[];
  }> {
    const logs = await this.prisma.irrigationLog.findMany({
      where: {
        gardenId,
        startTime: { gte: from, lte: to },
        status: 'completed',
      },
    });

    const totalIrrigations = logs.length;
    const totalDuration = logs.reduce(
      (sum, log) => sum + (log.duration || 0),
      0,
    );
    const avgDuration =
      totalIrrigations > 0 ? totalDuration / totalIrrigations : 0;

    // Group by mode
    const modeCount = logs.reduce(
      (acc, log) => {
        acc[log.mode] = (acc[log.mode] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const byMode = Object.entries(modeCount).map(([mode, count]) => ({
      mode,
      count,
    }));

    return {
      totalIrrigations,
      totalDuration,
      avgDuration: Math.round(avgDuration),
      byMode,
    };
  }
}
