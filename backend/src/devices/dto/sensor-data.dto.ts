import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO cho dữ liệu cảm biến từ ESP32
 */
export class SensorDataDto {
  @IsNumber()
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @IsOptional()
  air_humidity?: number;

  @IsNumber()
  @IsOptional()
  soil_moisture?: number;

  @IsBoolean()
  @IsOptional()
  is_dark?: boolean;
}

/**
 * DTO cho message sensor từ ESP32
 *
 * Format:
 * {
 *   "device_id": "ESP32_001",
 *   "timestamp": 1704189600000,
 *   "sensors": {
 *     "temperature": 28.5,
 *     "air_humidity": 65.2,
 *     "soil_moisture": 45.8,
 *     "is_dark": true
 *   }
 * }
 */
export class SensorMessageDto {
  @IsString()
  device_id: string;

  @IsNumber()
  timestamp: number;

  @ValidateNested()
  @Type(() => SensorDataDto)
  sensors: SensorDataDto;
}

/**
 * DTO cho message trạng thái thiết bị từ ESP32
 *
 * Format:
 * {
 *   "device_id": "ESP32_001",
 *   "timestamp": 1704189600000,
 *   "pump_status": false,
 *   "led_status": true,
 *   "is_connected": true
 * }
 */
export class DeviceStatusMessageDto {
  @IsString()
  device_id: string;

  @IsNumber()
  timestamp: number;

  @IsBoolean()
  pump_status: boolean;

  @IsBoolean()
  led_status: boolean;

  @IsBoolean()
  is_connected: boolean;
}

/**
 * DTO cho response API device
 */
export class DeviceResponseDto {
  id: number;
  deviceCode: string;
  temperature: number | null;
  airHumidity: number | null;
  soilMoisture: number | null;
  isDark: boolean;
  isPumpOn: boolean;
  isLedOn: boolean;
  isConnected: boolean;
  lastSeen: Date | null;
}
