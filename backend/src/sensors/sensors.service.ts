import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SensorLog } from '@prisma/client';
import { subDays } from 'date-fns';

@Injectable()
export class SensorsService {
  private readonly logger = new Logger(SensorsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Lưu sensor log cho garden
   */
  async createLog(
    gardenId: number,
    data: {
      temperature?: number;
      airHumidity?: number;
      soilMoisture?: number;
      isDark?: boolean;
    },
  ): Promise<SensorLog> {
    const log = await this.prisma.sensorLog.create({
      data: {
        gardenId,
        ...data,
      },
    });

    this.logger.debug(`📊 Sensor log created for garden ${gardenId}`);

    return log;
  }

  /**
   * Lấy sensor logs của garden theo khoảng thời gian
   */
  async getLogsByGarden(
    gardenId: number,
    options?: {
      from?: Date;
      to?: Date;
      limit?: number;
    },
  ): Promise<SensorLog[]> {
    const { from, to, limit = 500 } = options || {};

    return this.prisma.sensorLog.findMany({
      where: {
        gardenId,
        recordedAt: {
          ...(from && { gte: from }),
          ...(to && { lte: to }),
        },
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Lấy sensor logs mới nhất của garden
   */
  async getLatestLogs(
    gardenId: number,
    count: number = 10,
  ): Promise<SensorLog[]> {
    return this.prisma.sensorLog.findMany({
      where: { gardenId },
      orderBy: { recordedAt: 'desc' },
      take: count,
    });
  }

  /**
   * Lấy thống kê sensor trong khoảng thời gian
   */
  async getStatistics(
    gardenId: number,
    from: Date,
    to: Date,
  ): Promise<{
    avgTemperature: number | null;
    avgAirHumidity: number | null;
    avgSoilMoisture: number | null;
    minTemperature: number | null;
    maxTemperature: number | null;
    minSoilMoisture: number | null;
    maxSoilMoisture: number | null;
    totalRecords: number;
  }> {
    const result = await this.prisma.sensorLog.aggregate({
      where: {
        gardenId,
        recordedAt: {
          gte: from,
          lte: to,
        },
      },
      _avg: {
        temperature: true,
        airHumidity: true,
        soilMoisture: true,
      },
      _min: {
        temperature: true,
        soilMoisture: true,
      },
      _max: {
        temperature: true,
        soilMoisture: true,
      },
      _count: true,
    });

    return {
      avgTemperature: result._avg.temperature,
      avgAirHumidity: result._avg.airHumidity,
      avgSoilMoisture: result._avg.soilMoisture,
      minTemperature: result._min.temperature,
      maxTemperature: result._max.temperature,
      minSoilMoisture: result._min.soilMoisture,
      maxSoilMoisture: result._max.soilMoisture,
      totalRecords: result._count,
    };
  }

  /**
   * Xóa sensor logs cũ hơn 30 ngày
   */
  async deleteOldLogs(): Promise<number> {
    const thirtyDaysAgo = subDays(new Date(), 30);

    const result = await this.prisma.sensorLog.deleteMany({
      where: {
        recordedAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    if (result.count > 0) {
      this.logger.log(`🗑️ Deleted ${result.count} old sensor logs (> 30 days)`);
    }

    return result.count;
  }

  /**
   * Đếm số logs của garden
   */
  async countLogs(gardenId: number): Promise<number> {
    return this.prisma.sensorLog.count({
      where: { gardenId },
    });
  }
}
