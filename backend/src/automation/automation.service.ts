import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommandsService } from '../commands/commands.service';
import { IrrigationService } from '../irrigation/irrigation.service';
import { GardenGateway } from '../gateway/garden.gateway';
import { MqttService } from '../mqtt/mqtt.service';
import { SensorPayload } from '../common/types/mqtt-payload.types';

@Injectable()
export class AutomationService implements OnModuleInit {
  private readonly logger = new Logger(AutomationService.name);

  // Track gardens đang được tưới tự động để tránh spam
  private autoIrrigatingGardens: Set<number> = new Set();

  constructor(
    private prisma: PrismaService,
    private commandsService: CommandsService,
    private irrigationService: IrrigationService,
    private gardenGateway: GardenGateway,
    private mqttService: MqttService,
  ) { }

  onModuleInit() {
    // Đăng ký handler để xử lý automation khi nhận sensor data
    this.mqttService.registerHandler(
      'garden/+/sensors',
      this.handleSensorDataForAutomation.bind(this),
    );

    this.logger.log('✅ Automation handlers registered');
  }

  /**
   * Xử lý sensor data để thực hiện automation
   */
  async handleSensorDataForAutomation(
    topic: string,
    payload: SensorPayload,
  ): Promise<void> {
    try {
      const gardenId = this.mqttService.extractGardenIdFromTopic(topic);
      if (!gardenId) return;

      // Lấy thông tin garden
      const garden = await this.prisma.garden.findUnique({
        where: { id: gardenId },
        include: { device: true },
      });

      if (!garden || !garden.device) return;

      // Kiểm tra và thực hiện auto irrigation
      await this.checkAutoIrrigation(garden, payload);

      // Kiểm tra và thực hiện auto LED
      await this.checkAutoLed(garden, payload);
    } catch (error) {
      this.logger.error(`Automation error:  ${error.message}`, error.stack);
    }
  }

  /**
   * Kiểm tra và thực hiện tưới tự động theo độ ẩm
   */
  private async checkAutoIrrigation(
    garden: any,
    payload: SensorPayload,
  ): Promise<void> {
    // Chỉ xử lý nếu mode là 'auto'
    if (garden.irrigationMode !== 'auto') return;

    // Tránh spam nếu đang tưới
    if (this.autoIrrigatingGardens.has(garden.id)) return;

    const soilMoisture = payload.sensors.soil_moisture;
    if (soilMoisture === undefined || soilMoisture === null) return;

    // Kiểm tra độ ẩm có dưới ngưỡng không
    if (soilMoisture < garden.autoIrrigationThreshold) {
      this.logger.log(
        `🌱 Auto irrigation triggered for garden ${garden.id}:  ` +
        `soil=${soilMoisture}% < threshold=${garden.autoIrrigationThreshold}%`,
      );

      // Đánh dấu đang tưới
      this.autoIrrigatingGardens.add(garden.id);

      try {
        // Bắt đầu tưới
        await this.irrigationService.startIrrigation(
          garden.id,
          'auto',
          `Auto irrigation: soil moisture ${soilMoisture}% < threshold ${garden.autoIrrigationThreshold}%`,
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
          // Cập nhật device status
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

          // Đặt timer để tắt pump sau duration
          setTimeout(async () => {
            await this.stopAutoIrrigation(garden);
          }, garden.autoIrrigationDuration * 1000);
        } else {
          // Nếu command fail, kết thúc irrigation
          await this.irrigationService.endIrrigation(garden.id, 'failed');
          this.autoIrrigatingGardens.delete(garden.id);
        }
      } catch (error) {
        this.logger.error(`Auto irrigation failed:  ${error.message}`);
        this.autoIrrigatingGardens.delete(garden.id);
      }
    }
  }

  /**
   * Dừng tưới tự động
   */
  private async stopAutoIrrigation(garden: any): Promise<void> {
    try {
      this.logger.log(`💧 Auto irrigation stopping for garden ${garden.id}`);

      // Gửi lệnh tắt pump
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

      // Kết thúc irrigation log
      await this.irrigationService.endIrrigation(garden.id, 'completed');
    } catch (error) {
      this.logger.error(`Failed to stop auto irrigation: ${error.message}`);
      await this.irrigationService.endIrrigation(garden.id, 'failed');
    } finally {
      this.autoIrrigatingGardens.delete(garden.id);
    }
  }

  /**
   * Kiểm tra và thực hiện auto LED
   */
  private async checkAutoLed(
    garden: any,
    payload: SensorPayload,
  ): Promise<void> {
    // Chỉ xử lý nếu ledAutoMode được bật
    if (!garden.ledAutoMode) return;

    const isDark = payload.sensors.is_dark;
    if (isDark === undefined || isDark === null) return;

    const currentLedStatus = garden.device.isLedOn;

    // Nếu tối và đèn đang tắt -> bật đèn
    if (isDark && !currentLedStatus) {
      this.logger.log(`💡 Auto LED ON for garden ${garden.id} (dark detected)`);

      const result = await this.commandsService.sendCommand(
        garden.id,
        garden.device.id,
        'led_on',
      );

      if (result.status === 'success') {
        await this.prisma.device.update({
          where: { id: garden.device.id },
          data: { isLedOn: true },
        });

        this.gardenGateway.emitDeviceStatus(garden.id, {
          isLedOn: true,
          action: 'led_on',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Nếu sáng và đèn đang bật -> tắt đèn
    if (!isDark && currentLedStatus) {
      this.logger.log(
        `💡 Auto LED OFF for garden ${garden.id} (light detected)`,
      );

      const result = await this.commandsService.sendCommand(
        garden.id,
        garden.device.id,
        'led_off',
      );

      if (result.status === 'success') {
        await this.prisma.device.update({
          where: { id: garden.device.id },
          data: { isLedOn: false },
        });

        this.gardenGateway.emitDeviceStatus(garden.id, {
          isLedOn: false,
          action: 'led_off',
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Kiểm tra garden có đang trong quá trình tưới tự động không
   */
  isAutoIrrigating(gardenId: number): boolean {
    return this.autoIrrigatingGardens.has(gardenId);
  }
}
