import { PartialType } from '@nestjs/swagger';
import { CreateGardenDto } from './create-garden.dto';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IrrigationMode } from '@prisma/client';

/**
 * DTO cập nhật thông tin vườn
 * Bao gồm cài đặt tưới tự động, đèn và cảnh báo
 */
export class UpdateGardenDto extends PartialType(CreateGardenDto) {
  @ApiPropertyOptional({
    enum: IrrigationMode,
    description:
      'Chế độ tưới (manual: thủ công, auto: tự động theo độ ẩm, scheduled: theo lịch)',
    example: 'auto',
  })
  @IsOptional()
  @IsEnum(IrrigationMode)
  irrigationMode?: IrrigationMode;

  @ApiPropertyOptional({
    description:
      'Ngưỡng độ ẩm đất tự động tưới (%) - tưới khi độ ẩm đất xuống dưới mức này',
    example: 30,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  autoIrrigationThreshold?: number;

  @ApiPropertyOptional({
    description: 'Thời gian tưới tự động (giây)',
    example: 60,
    minimum: 10,
    maximum: 600,
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(600)
  autoIrrigationDuration?: number;

  @ApiPropertyOptional({
    description: 'Chu kỳ tưới định kỳ (giờ)',
    example: 24,
    minimum: 1,
    maximum: 168,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  periodicIntervalHours?: number;

  @ApiPropertyOptional({
    description: 'Chế độ đèn tự động - bật đèn khi trời tối',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  ledAutoMode?: boolean;

  @ApiPropertyOptional({
    description: 'Nhiệt độ cảnh báo tối thiểu (°C)',
    example: 15,
  })
  @IsOptional()
  @IsNumber()
  alertMinTemperature?: number;

  @ApiPropertyOptional({
    description: 'Nhiệt độ cảnh báo tối đa (°C)',
    example: 35,
  })
  @IsOptional()
  @IsNumber()
  alertMaxTemperature?: number;

  @ApiPropertyOptional({
    description: 'Độ ẩm đất cảnh báo tối thiểu (%)',
    example: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  alertMinSoilMoisture?: number;
}
