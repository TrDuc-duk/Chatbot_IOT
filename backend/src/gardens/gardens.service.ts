import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommandsService } from '../commands/commands.service';
import { DevicesService } from '../devices/devices.service';
import { GardenGateway } from '../gateway/garden.gateway';
import { IrrigationService } from '../irrigation/irrigation.service';
import { CreateGardenDto } from './dto/create-garden.dto';
import { UpdateGardenDto } from './dto/update-garden.dto';
import { Garden, Device } from '@prisma/client';
import { CommandResponseDto } from '../commands/dto/command.dto';

// Type cho Garden với relations
type GardenWithRelations = Garden & {
  device?: Device | null;
};

@Injectable()
export class GardensService {
  private readonly logger = new Logger(GardensService.name);

  constructor(
    private prisma: PrismaService,
    private commandsService: CommandsService,
    private devicesService: DevicesService,
    private gardenGateway: GardenGateway,
    private irrigationService: IrrigationService,
  ) { }

  /**
   * Tạo garden mới
   */
  async create(userId: number, dto: CreateGardenDto): Promise<Garden> {
    let deviceId: number | undefined;

    // Nếu có device code, tìm hoặc tạo device
    if (dto.deviceCode) {
      const device = await this.devicesService.create(dto.deviceCode);

      // Kiểm tra device đã được gán cho garden khác chưa
      const existingGarden = await this.prisma.garden.findUnique({
        where: { deviceId: device.id },
      });

      if (existingGarden) {
        throw new ConflictException(
          `Device ${dto.deviceCode} is already assigned to garden "${existingGarden.gardenName}"`,
        );
      }

      deviceId = device.id;
    }

    // Tạo garden
    const garden = await this.prisma.garden.create({
      data: {
        gardenName: dto.gardenName,
        description: dto.description,
        irrigationMode: dto.irrigationMode || 'manual',
        userId,
        plantId: dto.plantId,
        deviceId,
      },
      include: {
        device: true,
        plant: true,
      },
    });

    // Tạo irrigation record cho garden
    await this.prisma.irrigation.create({
      data: {
        gardenId: garden.id,
        isActive: false,
      },
    });

    this.logger.log(`🌱 Garden created: ${garden.gardenName} (ID: ${garden.id})`);

    return garden;
  }

  /**
   * Lấy tất cả gardens của user
   */
  async findAllByUser(userId: number): Promise<Garden[]> {
    return this.prisma.garden.findMany({
      where: { userId },
      include: {
        device: true,
        plant: true,
        irrigation: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lấy garden theo ID
   */
  async findById(id: number, userId?: number): Promise<GardenWithRelations> {
    const garden = await this.prisma.garden.findUnique({
      where: { id },
      include: {
        device: true,
        plant: true,
        irrigation: true,
      },
    });

    if (!garden) {
      throw new NotFoundException(`Garden with ID ${id} not found`);
    }

    // Nếu có userId, kiểm tra quyền sở hữu
    if (userId && garden.userId !== userId) {
      throw new NotFoundException(`Garden with ID ${id} not found`);
    }

    return garden;
  }

  /**
   * Cập nhật garden
   */
  async update(
    id: number,
    userId: number,
    dto: UpdateGardenDto,
  ): Promise<Garden> {
    // Kiểm tra garden tồn tại và thuộc về user
    await this.findById(id, userId);

    // Nếu đổi device
    let deviceId: number | undefined;
    if (dto.deviceCode) {
      const device = await this.devicesService.create(dto.deviceCode);

      // Kiểm tra device đã được gán cho garden khác chưa
      const existingGarden = await this.prisma.garden.findFirst({
        where: {
          deviceId: device.id,
          NOT: { id },
        },
      });

      if (existingGarden) {
        throw new ConflictException(
          `Device ${dto.deviceCode} is already assigned to another garden`,
        );
      }

      deviceId = device.id;
    }

    const { deviceCode, ...updateData } = dto;

    return this.prisma.garden.update({
      where: { id },
      data: {
        ...updateData,
        ...(deviceId && { deviceId }),
      },
      include: {
        device: true,
        plant: true,
      },
    });
  }

  /**
   * Xóa garden
   */
  async delete(id: number, userId: number): Promise<void> {
    await this.findById(id, userId);

    await this.prisma.garden.delete({
      where: { id },
    });

    this.logger.log(`🗑️ Garden deleted: ID ${id}`);
  }

  // ==========================================
  // DEVICE CONTROL
  // ==========================================

  /**
   * Bật máy bơm
   */
  async turnPumpOn(
    gardenId: number,
    userId: number,
    durationSeconds: number = 60,
  ): Promise<CommandResponseDto> {
    const garden = await this.findById(gardenId, userId);

    if (!garden.device) {
      throw new BadRequestException('Garden does not have a device assigned');
    }

    if (!garden.device.isConnected) {
      throw new BadRequestException('Device is offline');
    }

    // Kiểm tra pump đã bật chưa
    if (garden.device.isPumpOn) {
      throw new ConflictException('Pump is already running');
    }

    // Kiểm tra có command đang pending không
    if (this.commandsService.hasActivePumpCommand(gardenId)) {
      throw new ConflictException('A pump command is already in progress');
    }

    this.logger.log(`💧 Turning pump ON for garden ${gardenId} (${durationSeconds}s)`);

    // Gửi lệnh và đợi ACK
    const result = await this.commandsService.sendCommand(
      gardenId,
      garden.device.id,
      'pump_on',
      durationSeconds,
    );

    // Nếu thành công, cập nhật trạng thái và emit WebSocket
    if (result.status === 'success') {
      await this.prisma.device.update({
        where: { id: garden.device.id },
        data: { isPumpOn: true },
      });

      // Emit real-time update
      this.gardenGateway.emitDeviceStatus(gardenId, {
        isPumpOn: true,
        action: 'pump_on',
        timestamp: new Date().toISOString(),
      });

      // Log irrigation với duration
      await this.irrigationService.startIrrigation(
        gardenId,
        'manual',
        `Manual pump on for ${durationSeconds} seconds`,
        durationSeconds,
      );

      // Đặt timer để tự động complete nếu ESP32 không gửi status update
      // (fallback mechanism)
      setTimeout(async () => {
        try {
          // Kiểm tra xem irrigation đã được complete chưa
          const irrigation = await this.prisma.irrigation.findUnique({
            where: { gardenId },
          });

          // Nếu vẫn đang active, nghĩa là MQTT message bị miss
          if (irrigation?.isActive) {
            this.logger.warn(
              `⏰ Auto-completing irrigation for garden ${gardenId} (timer fallback)`,
            );
            await this.irrigationService.endIrrigation(gardenId, 'completed');
          }
        } catch (error) {
          this.logger.error(
            `Failed to auto-complete irrigation: ${error.message}`,
          );
        }
      }, (durationSeconds + 5) * 1000); // +5s buffer
    }

    return result;
  }

  /**
   * Tắt máy bơm
   */
  async turnPumpOff(
    gardenId: number,
    userId: number,
  ): Promise<CommandResponseDto> {
    const garden = await this.findById(gardenId, userId);

    if (!garden.device) {
      throw new BadRequestException('Garden does not have a device assigned');
    }

    if (!garden.device.isConnected) {
      throw new BadRequestException('Device is offline');
    }

    this.logger.log(`💧 Turning pump OFF for garden ${gardenId}`);

    const result = await this.commandsService.sendCommand(
      gardenId,
      garden.device.id,
      'pump_off',
    );

    if (result.status === 'success') {
      await this.prisma.device.update({
        where: { id: garden.device.id },
        data: { isPumpOn: false },
      });

      this.gardenGateway.emitDeviceStatus(gardenId, {
        isPumpOn: false,
        action: 'pump_off',
        timestamp: new Date().toISOString(),
      });

      // Kết thúc irrigation log
      await this.irrigationService.endIrrigation(gardenId, 'completed');
    }

    return result;
  }

  /**
   * Bật đèn LED
   */
  async turnLedOn(
    gardenId: number,
    userId: number,
  ): Promise<CommandResponseDto> {
    const garden = await this.findById(gardenId, userId);

    if (!garden.device) {
      throw new BadRequestException('Garden does not have a device assigned');
    }

    if (!garden.device.isConnected) {
      throw new BadRequestException('Device is offline');
    }

    if (garden.device.isLedOn) {
      throw new ConflictException('LED is already on');
    }

    this.logger.log(`💡 Turning LED ON for garden ${gardenId}`);

    const result = await this.commandsService.sendCommand(
      gardenId,
      garden.device.id,
      'led_on',
    );

    if (result.status === 'success') {
      await this.prisma.device.update({
        where: { id: garden.device.id },
        data: { isLedOn: true },
      });

      this.gardenGateway.emitDeviceStatus(gardenId, {
        isLedOn: true,
        action: 'led_on',
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  }

  /**
   * Tắt đèn LED
   */
  async turnLedOff(
    gardenId: number,
    userId: number,
  ): Promise<CommandResponseDto> {
    const garden = await this.findById(gardenId, userId);

    if (!garden.device) {
      throw new BadRequestException('Garden does not have a device assigned');
    }

    if (!garden.device.isConnected) {
      throw new BadRequestException('Device is offline');
    }

    this.logger.log(`💡 Turning LED OFF for garden ${gardenId}`);

    const result = await this.commandsService.sendCommand(
      gardenId,
      garden.device.id,
      'led_off',
    );

    if (result.status === 'success') {
      await this.prisma.device.update({
        where: { id: garden.device.id },
        data: { isLedOn: false },
      });

      this.gardenGateway.emitDeviceStatus(gardenId, {
        isLedOn: false,
        action: 'led_off',
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  }

  /**
   * Lấy trạng thái real-time của garden
   */
  async getGardenStatus(gardenId: number, userId: number) {
    const garden = await this.findById(gardenId, userId);

    return {
      gardenId: garden.id,
      gardenName: garden.gardenName,
      irrigationMode: garden.irrigationMode,
      device: garden.device
        ? {
          deviceCode: garden.device.deviceCode,
          isConnected: garden.device.isConnected,
          isPumpOn: garden.device.isPumpOn,
          isLedOn: garden.device.isLedOn,
          lastSeen: garden.device.lastSeen,
          sensors: {
            temperature: garden.device.temperature,
            airHumidity: garden.device.airHumidity,
            soilMoisture: garden.device.soilMoisture,
            isDark: garden.device.isDark,
          },
        }
        : null,
    };
  }
}