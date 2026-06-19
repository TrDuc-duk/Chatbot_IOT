import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MqttService } from '../mqtt/mqtt.service';
import { GardenGateway } from '../gateway/garden.gateway';
import { IrrigationService } from '../irrigation/irrigation.service';
import {
  SensorMessageDto,
  DeviceStatusMessageDto,
} from './dto/sensor-data.dto';
import { Device } from '@prisma/client';

@Injectable()
export class DevicesService implements OnModuleInit {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    private prisma: PrismaService,
    private mqttService: MqttService,
    @Inject(forwardRef(() => GardenGateway))
    private gardenGateway: GardenGateway,
    private irrigationService: IrrigationService,
  ) { }

  onModuleInit() {
    this.mqttService.registerHandler(
      'garden/+/sensors',
      this.handleSensorData.bind(this),
    );

    this.mqttService.registerHandler(
      'garden/+/status',
      this.handleDeviceStatus.bind(this),
    );

    this.logger.log('✅ Device MQTT handlers registered');

    // Ensure topics are subscribed AFTER handlers are registered
    this.mqttService.ensureSubscribed();
  }

  /**
   * Xử lý dữ liệu cảm biến từ ESP32
   */
  async handleSensorData(
    topic: string,
    payload: SensorMessageDto,
  ): Promise<void> {
    this.logger.debug('handleSensorData CALLED with topic: ' + topic);
    try {
      const gardenId = this.mqttService.extractGardenIdFromTopic(topic);

      if (!gardenId) {
        this.logger.warn(`Invalid topic format: ${topic}`);
        return;
      }

      this.logger.debug(
        `📊 Sensor data from garden ${gardenId}: ` +
        `temp=${payload.sensors.temperature}°C, ` +
        `humidity=${payload.sensors.air_humidity}%, ` +
        `soil=${payload.sensors.soil_moisture}%, ` +
        `dark=${payload.sensors.is_dark}`,
      );

      const device = await this.prisma.device.findUnique({
        where: { deviceCode: payload.device_id },
      });

      if (!device) {
        this.logger.log(`Creating new device:  ${payload.device_id}`);
        await this.prisma.device.create({
          data: {
            deviceCode: payload.device_id,
            temperature: payload.sensors.temperature,
            airHumidity: payload.sensors.air_humidity,
            soilMoisture: payload.sensors.soil_moisture,
            isDark: payload.sensors.is_dark ?? false,
            isConnected: true,
            lastSeen: new Date(),
          },
        });
      } else {
        await this.prisma.device.update({
          where: { id: device.id },
          data: {
            temperature: payload.sensors.temperature,
            airHumidity: payload.sensors.air_humidity,
            soilMoisture: payload.sensors.soil_moisture,
            isDark: payload.sensors.is_dark ?? device.isDark,
            isConnected: true,
            lastSeen: new Date(),
          },
        });
      }

      // *** MỚI:  Emit WebSocket event ***
      this.gardenGateway.emitSensorUpdate(gardenId, {
        temperature: payload.sensors.temperature,
        airHumidity: payload.sensors.air_humidity,
        soilMoisture: payload.sensors.soil_moisture,
        isDark: payload.sensors.is_dark,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle sensor data: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Xử lý cập nhật trạng thái thiết bị từ ESP32
   */
  async handleDeviceStatus(
    topic: string,
    payload: DeviceStatusMessageDto,
  ): Promise<void> {
    try {
      const gardenId = this.mqttService.extractGardenIdFromTopic(topic);

      this.logger.debug(
        `📡 Device status: ${payload.device_id} - ` +
        `pump=${payload.pump_status}, led=${payload.led_status}, ` +
        `connected=${payload.is_connected}`,
      );

      // Get current device state to detect pump status change
      const currentDevice = await this.prisma.device.findUnique({
        where: { deviceCode: payload.device_id },
        include: { garden: true },
      });

      const wasPumpOn = currentDevice?.isPumpOn || false;
      const isPumpOn = payload.pump_status;

      await this.prisma.device.update({
        where: { deviceCode: payload.device_id },
        data: {
          isPumpOn: payload.pump_status,
          isLedOn: payload.led_status,
          isConnected: payload.is_connected,
          lastSeen: new Date(),
        },
      });

      // *** MỚI: Emit WebSocket event ***
      if (gardenId) {
        this.gardenGateway.emitDeviceStatus(gardenId, {
          isPumpOn: payload.pump_status,
          isLedOn: payload.led_status,
          isConnected: payload.is_connected,
          timestamp: new Date().toISOString(),
        });

        // Nếu pump vừa tắt (was ON -> now OFF), cập nhật irrigation log
        if (wasPumpOn && !isPumpOn && currentDevice?.garden) {
          this.logger.log(
            `💧 Pump turned off for garden ${gardenId}, ending irrigation log`,
          );
          await this.irrigationService.endIrrigation(gardenId, 'completed');
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle device status: ${error.message}`,
        error.stack,
      );
    }
  }

  async findById(id: number): Promise<Device> {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    return device;
  }

  async findByDeviceCode(deviceCode: string): Promise<Device> {
    const device = await this.prisma.device.findUnique({
      where: { deviceCode },
    });

    if (!device) {
      throw new NotFoundException(`Device with code ${deviceCode} not found`);
    }

    return device;
  }

  async findAll(): Promise<Device[]> {
    return this.prisma.device.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(deviceCode: string): Promise<Device> {
    const existing = await this.prisma.device.findUnique({
      where: { deviceCode },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.device.create({
      data: {
        deviceCode,
        isConnected: false,
      },
    });
  }

  async checkDeviceOnlineStatus(deviceId: number): Promise<boolean> {
    const device = await this.findById(deviceId);

    if (!device.lastSeen) {
      return false;
    }

    const thirtySecondsAgo = new Date(Date.now() - 30000);
    return device.lastSeen > thirtySecondsAgo;
  }
}
