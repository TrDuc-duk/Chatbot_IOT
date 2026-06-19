import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  DeviceAction,
  CommandStatus,
} from '../../common/types/mqtt-payload.types';

/**
 * DTO tạo lệnh điều khiển thiết bị
 */
export class CreateCommandDto {
  @ApiProperty({
    enum: ['pump_on', 'pump_off', 'led_on', 'led_off'],
    description:
      'Hành động điều khiển (pump_on: bật bơm, pump_off: tắt bơm, led_on: bật đèn, led_off: tắt đèn)',
    example: 'pump_on',
  })
  @IsEnum(['pump_on', 'pump_off', 'led_on', 'led_off'])
  action: DeviceAction;

  @ApiPropertyOptional({
    description: 'Thời gian chạy (giây) - chỉ áp dụng cho pump_on',
    example: 60,
    minimum: 1,
    maximum: 3600,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3600) // Tối đa 1 giờ
  durationSeconds?: number;
}

/**
 * DTO response khi gửi lệnh
 */
export class CommandResponseDto {
  @ApiProperty({ example: 'cmd_abc123', description: 'Mã lệnh duy nhất' })
  commandId: string;

  @ApiProperty({ example: 'pump_on', description: 'Hành động đã gửi' })
  action: DeviceAction;

  @ApiProperty({
    example: 'pending',
    description: 'Trạng thái lệnh (pending/acked/completed/failed/timeout)',
  })
  status: CommandStatus;

  @ApiProperty({
    example: '2026-01-02T10:00:00.000Z',
    description: 'Thời gian gửi lệnh',
  })
  sentAt: string;

  @ApiPropertyOptional({
    example: 'Lệnh đã được gửi thành công',
    description: 'Thông báo',
  })
  message?: string;
}

/**
 * Lưu trữ thông tin command đang chờ xử lý
 */
export interface PendingCommand {
  commandId: string;
  gardenId: number;
  deviceId: number;
  action: DeviceAction;
  status: CommandStatus;
  sentAt: Date;
  parameters?: {
    durationSeconds?: number;
  };
  // Callback khi nhận ACK
  resolve?: (value: any) => void;
  reject?: (reason: any) => void;
  // Timeout handle
  timeoutHandle?: NodeJS.Timeout;
}
