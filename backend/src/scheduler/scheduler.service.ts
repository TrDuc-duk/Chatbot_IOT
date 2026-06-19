import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SensorsService } from '../sensors/sensors.service';
import { CommandsService } from '../commands/commands.service';
import { IrrigationService } from '../irrigation/irrigation.service';
import { GardenGateway } from '../gateway/garden.gateway';
import { differenceInHours, differenceInMinutes } from 'date-fns';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  // Track lần cuối lưu sensor log cho mỗi garden
  private lastSensorLogTime: Map<number, Date> = new Map();

  constructor(
    private prisma: PrismaService,
    private sensorsService: SensorsService,
    private commandsService: CommandsService,
    private irrigationService: IrrigationService,
    private gardenGateway: GardenGateway,
  ) { }

  /**
   * Lưu sensor log mỗi 5 phút
   * Cron:  Chạy mỗi 5 phút (0, 5, 10, 15, ...  phút)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async saveSensorLogs(): Promise<void> {
    this.logger.debug('⏰ Running sensor log cron job');

    try {
      // Lấy tất cả gardens có device connected
      const gardens = await this.prisma.garden.findMany({
        where: {
          device: {
            isConnected: true,
          },
        },
        include: { device: true },
      });

      for (const garden of gardens) {
        if (!garden.device) continue;

        // Lưu sensor log
        await this.sensorsService.createLog(garden.id, {
          temperature: garden.device.temperature ?? undefined,
          airHumidity: garden.device.airHumidity ?? undefined,
          soilMoisture: garden.device.soilMoisture ?? undefined,
          isDark: garden.device.isDark ?? undefined,
        });
      }

      this.logger.debug(`📊 Saved sensor logs for ${gardens.length} gardens`);
    } catch (error) {
      this.logger.error(`Sensor log cron failed: ${error.message}`);
    }
  }

  /**
   * Kiểm tra tưới theo chu kỳ mỗi phút
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkPeriodicIrrigation(): Promise<void> {
    try {
      // Lấy gardens có mode = 'periodic' và device connected
      const gardens = await this.prisma.garden.findMany({
        where: {
          irrigationMode: 'periodic',
          device: {
            isConnected: true,
            isPumpOn: false, // Không đang bơm
          },
        },
        include: { device: true },
      });

      const now = new Date();

      for (const garden of gardens) {
        if (!garden.device) continue;

        // Kiểm tra đã đến lúc tưới chưa
        const lastIrrigation = garden.periodicLastIrrigation;
        const intervalHours = garden.periodicIntervalHours;

        let shouldIrrigate = false;

        if (!lastIrrigation) {
          // Chưa bao giờ tưới -> tưới ngay
          shouldIrrigate = true;
        } else {
          // Kiểm tra đã qua interval chưa
          const minutesSinceLastIrrigation = differenceInMinutes(
            now,
            lastIrrigation,
          );
          shouldIrrigate = minutesSinceLastIrrigation >= intervalHours;
        }

        if (shouldIrrigate) {
          this.logger.log(
            `⏰ Periodic irrigation triggered for garden ${garden.id} ` +
            `(interval: ${intervalHours}h)`,
          );

          await this.executePeriodicIrrigation(garden);
        }
      }
    } catch (error) {
      this.logger.error(`Periodic irrigation cron failed: ${error.message}`);
    }
  }

  /**
   * Thực hiện tưới theo chu kỳ
   */
  private async executePeriodicIrrigation(garden: any): Promise<void> {
    try {
      // Bắt đầu irrigation log
      await this.irrigationService.startIrrigation(
        garden.id,
        'periodic',
        `Periodic irrigation (every ${garden.periodicIntervalHours} hours)`,
        garden.autoIrrigationDuration,
      );

      // Gửi lệnh bật pump
      const result = await this.commandsService.sendCommand(
        garden.id,
        garden.device.id,
        'pump_on',
        garden.autoIrrigationDuration,
      );

      if (result.status === 'success') {
        // Cập nhật device và thời gian tưới cuối
        await this.prisma.garden.update({
          where: { id: garden.id },
          data: { periodicLastIrrigation: new Date() },
        });

        await this.prisma.device.update({
          where: { id: garden.device.id },
          data: { isPumpOn: true },
        });

        // Emit WebSocket
        this.gardenGateway.emitDeviceStatus(garden.id, {
          isPumpOn: true,
          action: 'pump_on',
          timestamp: new Date().toISOString(),
        });

        // Đặt timer tắt pump
        setTimeout(async () => {
          await this.stopPeriodicIrrigation(garden);
        }, garden.autoIrrigationDuration * 1000);
      } else {
        await this.irrigationService.endIrrigation(garden.id, 'failed');
      }
    } catch (error) {
      this.logger.error(`Periodic irrigation failed: ${error.message}`);
      await this.irrigationService.endIrrigation(garden.id, 'failed');
    }
  }

  /**
   * Dừng tưới theo chu kỳ
   */
  private async stopPeriodicIrrigation(garden: any): Promise<void> {
    try {
      const result = await this.commandsService.sendCommand(
        garden.id,
        garden.device.id,
        'pump_off',
      );

      if (result.status === 'success') {
        await this.prisma.device.update({
          where: { id: garden.device.id },
          data: { isPumpOn: false },
        });

        this.gardenGateway.emitDeviceStatus(garden.id, {
          isPumpOn: false,
          action: 'pump_off',
          timestamp: new Date().toISOString(),
        });
      }

      await this.irrigationService.endIrrigation(garden.id, 'completed');
    } catch (error) {
      this.logger.error(`Failed to stop periodic irrigation: ${error.message}`);
      await this.irrigationService.endIrrigation(garden.id, 'failed');
    }
  }

  /**
   * Xóa sensor logs cũ hơn 30 ngày
   * Chạy lúc 2:00 AM mỗi ngày
   */
  @Cron('0 2 * * *')
  async cleanupOldSensorLogs(): Promise<void> {
    this.logger.log('🗑️ Running sensor log cleanup cron job');

    try {
      const deletedCount = await this.sensorsService.deleteOldLogs();
      this.logger.log(
        `🗑️ Cleanup completed:  deleted ${deletedCount} old logs`,
      );
    } catch (error) {
      this.logger.error(`Sensor log cleanup failed: ${error.message}`);
    }
  }

  /**
   * Kiểm tra device offline
   * Chạy mỗi 30 giây
   */
  @Cron('*/30 * * * * *')
  async checkDeviceConnectivity(): Promise<void> {
    try {
      const thirtySecondsAgo = new Date(Date.now() - 30000);

      // Tìm devices đang connected nhưng không gửi data trong 30s
      const offlineDevices = await this.prisma.device.findMany({
        where: {
          isConnected: true,
          lastSeen: {
            lt: thirtySecondsAgo,
          },
        },
        include: {
          garden: true,
        },
      });

      for (const device of offlineDevices) {
        this.logger.warn(`⚠️ Device ${device.deviceCode} went offline`);

        // Cập nhật trạng thái
        await this.prisma.device.update({
          where: { id: device.id },
          data: { isConnected: false },
        });

        // Emit WebSocket nếu có garden
        if (device.garden) {
          this.gardenGateway.emitDeviceStatus(device.garden.id, {
            isConnected: false,
            timestamp: new Date().toISOString(),
          });

          // TODO: Gửi notification
        }
      }
    } catch (error) {
      this.logger.error(`Device connectivity check failed: ${error.message}`);
    }
  }
}
