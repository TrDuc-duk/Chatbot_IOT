import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IrrigationMode } from '@prisma/client';

/**
 * DTO tạo vườn mới
 */
export class CreateGardenDto {
  @ApiProperty({
    description: 'Tên vườn',
    example: 'Vườn rau sân thượng',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  gardenName: string;

  @ApiPropertyOptional({
    description: 'Mô tả vườn',
    example: 'Vườn rau organic trên sân thượng tầng 5',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Mã thiết bị ESP32 liên kết',
    example: 'ESP32_001',
  })
  @IsOptional()
  @IsString()
  deviceCode?: string;

  @ApiPropertyOptional({
    description: 'ID loại cây trồng',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  plantId?: number;

  @ApiPropertyOptional({
    enum: IrrigationMode,
    default: 'manual',
    description:
      'Chế độ tưới (manual: thủ công, auto: tự động, scheduled: theo lịch)',
  })
  @IsOptional()
  @IsEnum(IrrigationMode)
  irrigationMode?: IrrigationMode;
}
