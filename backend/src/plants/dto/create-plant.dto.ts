import {
  IsString,
  IsOptional,
  IsNumber,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO tạo loại cây trồng mới
 * Bao gồm các thông số môi trường lý tưởng để chăm sóc
 */
export class CreatePlantDto {
  @ApiProperty({
    description: 'Tên cây trồng',
    example: 'Cà chua',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Mô tả về cây trồng và cách chăm sóc',
    example: 'Cây cà chua thích hợp trồng trong điều kiện ấm áp',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Nhiệt độ tối thiểu (°C)',
    example: 18,
    default: 15,
  })
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(50)
  minTemperature?: number;

  @ApiPropertyOptional({
    description: 'Nhiệt độ tối đa (°C)',
    example: 32,
    default: 35,
  })
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(50)
  maxTemperature?: number;

  @ApiPropertyOptional({
    description: 'Độ ẩm không khí tối thiểu (%)',
    example: 50,
    default: 40,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minAirHumidity?: number;

  @ApiPropertyOptional({
    description: 'Độ ẩm không khí tối đa (%)',
    example: 80,
    default: 80,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxAirHumidity?: number;

  @ApiPropertyOptional({
    description: 'Độ ẩm đất tối thiểu (%)',
    example: 40,
    default: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minSoilMoisture?: number;

  @ApiPropertyOptional({
    description: 'Độ ẩm đất tối đa (%)',
    example: 70,
    default: 70,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxSoilMoisture?: number;
}
