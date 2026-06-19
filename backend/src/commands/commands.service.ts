import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { MqttService } from '../mqtt/mqtt.service';
import {
  DeviceAction,
  CommandPayload,
  CommandAckPayload,
  CommandStatus,
} from '../common/types/mqtt-payload.types';
import { PendingCommand, CommandResponseDto } from './dto/command.dto';

/**
 * CommandsService - Quản lý việc gửi lệnh và nhận ACK từ ESP32
 *
 * Flow:
 * 1. Client gọi API điều khiển
 * 2. Service tạo command với unique ID
 * 3. Publish command qua MQTT
 * 4. Đợi ACK từ ESP32 (với timeout)
 * 5. Trả kết quả về cho client
 */
@Injectable()
export class CommandsService implements OnModuleInit {
  private readonly logger = new Logger(CommandsService.name);

  // Lưu trữ các command đang chờ ACK
  // Key: command_id, Value: PendingCommand
  private pendingCommands: Map<string, PendingCommand> = new Map();

  // Timeout mặc định (ms)
  private commandTimeout: number;

  constructor(
    private mqttService: MqttService,
    private configService: ConfigService,
  ) {
    this.commandTimeout = this.configService.get<number>(
      'websocket.commandTimeout',
      10000,
    );
  }

  /**
   * Đăng ký handler cho command ACK khi module khởi tạo
   */
  onModuleInit() {
    this.mqttService.registerHandler(
      'garden/+/command/ack',
      this.handleCommandAck.bind(this),
    );
    this.logger.log('✅ Command ACK handler registered');
  }

  /**
   * Gửi lệnh điều khiển và đợi ACK
   *
   * @param gardenId - ID của garden
   * @param deviceId - ID của device
   * @param action - Hành động (pump_on, pump_off, led_on, led_off)
   * @param durationSeconds - Thời gian (giây) cho pump_on
   * @returns Promise<CommandResponseDto>
   */
  async sendCommand(
    gardenId: number,
    deviceId: number,
    action: DeviceAction,
    durationSeconds?: number,
  ): Promise<CommandResponseDto> {
    // Tạo unique command ID
    const commandId = `cmd_${randomUUID().substring(0, 12)}`;
    const timestamp = Date.now();

    // Tạo payload
    const payload: CommandPayload = {
      command_id: commandId,
      action,
      timestamp,
    };

    // Thêm parameters nếu có
    if (durationSeconds && action === 'pump_on') {
      payload.parameters = { duration_seconds: durationSeconds };
    }

    // Topic để gửi lệnh
    const topic = `garden/${gardenId}/command`;

    // Tạo pending command
    const pendingCommand: PendingCommand = {
      commandId,
      gardenId,
      deviceId,
      action,
      status: 'pending',
      sentAt: new Date(),
      parameters: { durationSeconds },
    };

    // Lưu vào map
    this.pendingCommands.set(commandId, pendingCommand);

    try {
      // Publish command qua MQTT
      await this.mqttService.publish(topic, payload);

      this.logger.log(
        `📤 Command sent:  ${commandId} - ${action} to garden ${gardenId}`,
      );

      // Cập nhật status
      pendingCommand.status = 'sent';

      // Đợi ACK với timeout
      const result = await this.waitForAck(commandId);

      return {
        commandId,
        action,
        status: result.status,
        sentAt: pendingCommand.sentAt.toISOString(),
        message: result.message,
      };
    } catch (error) {
      // Xử lý timeout hoặc lỗi
      this.logger.error(`❌ Command failed: ${commandId} - ${error.message}`);

      pendingCommand.status = 'failed';

      return {
        commandId,
        action,
        status: 'failed',
        sentAt: pendingCommand.sentAt.toISOString(),
        message: error.message,
      };
    } finally {
      // Cleanup
      this.pendingCommands.delete(commandId);
    }
  }

  /**
   * Đợi ACK từ ESP32 với timeout
   */
  private waitForAck(
    commandId: string,
  ): Promise<{ status: CommandStatus; message?: string }> {
    return new Promise((resolve, reject) => {
      const pendingCommand = this.pendingCommands.get(commandId);

      if (!pendingCommand) {
        reject(new Error('Command not found'));
        return;
      }

      // Lưu resolve/reject để gọi khi nhận ACK
      pendingCommand.resolve = resolve;
      pendingCommand.reject = reject;

      // Set timeout
      pendingCommand.timeoutHandle = setTimeout(() => {
        this.logger.warn(`⏱️ Command timeout: ${commandId}`);
        pendingCommand.status = 'timeout';
        reject(new Error('Command timeout - ESP32 did not respond'));
      }, this.commandTimeout);
    });
  }

  /**
   * Xử lý ACK từ ESP32
   */
  private handleCommandAck(topic: string, payload: CommandAckPayload): void {
    const { command_id, status, message } = payload;

    this.logger.debug(
      `📨 ACK received: ${command_id} - ${status} - ${message || ''}`,
    );

    const pendingCommand = this.pendingCommands.get(command_id);

    if (!pendingCommand) {
      this.logger.warn(`⚠️ ACK for unknown command: ${command_id}`);
      return;
    }

    // Clear timeout
    if (pendingCommand.timeoutHandle) {
      clearTimeout(pendingCommand.timeoutHandle);
    }

    // Resolve promise
    if (pendingCommand.resolve) {
      pendingCommand.status = status === 'success' ? 'success' : 'failed';
      pendingCommand.resolve({
        status: pendingCommand.status,
        message: message || `Command ${status}`,
      });
    }
  }

  /**
   * Gửi lệnh không đợi ACK (fire and forget)
   * Dùng cho các trường hợp không cần confirm
   */
  async sendCommandNoWait(
    gardenId: number,
    action: DeviceAction,
    durationSeconds?: number,
  ): Promise<string> {
    const commandId = `cmd_${randomUUID().substring(0, 12)}`;

    const payload: CommandPayload = {
      command_id: commandId,
      action,
      timestamp: Date.now(),
    };

    if (durationSeconds && action === 'pump_on') {
      payload.parameters = { duration_seconds: durationSeconds };
    }

    const topic = `garden/${gardenId}/command`;
    await this.mqttService.publish(topic, payload);

    this.logger.log(`📤 Command sent (no wait): ${commandId} - ${action}`);

    return commandId;
  }

  /**
   * Lấy danh sách commands đang pending
   */
  getPendingCommands(): PendingCommand[] {
    return Array.from(this.pendingCommands.values());
  }

  /**
   * Kiểm tra có command nào đang pending cho garden không
   */
  hasActivePumpCommand(gardenId: number): boolean {
    for (const cmd of this.pendingCommands.values()) {
      if (
        cmd.gardenId === gardenId &&
        cmd.action === 'pump_on' &&
        (cmd.status === 'pending' || cmd.status === 'sent')
      ) {
        return true;
      }
    }
    return false;
  }
}
