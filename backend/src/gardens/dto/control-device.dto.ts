import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO điều khiển máy bơm
 * Cho phép bật máy bơm với thời gian tự động tắt
 */
export class PumpControlDto {
  @ApiPropertyOptional({
    description:
      'Thời gian bơm (giây). Sau thời gian này máy bơm sẽ tự động tắt',
    example: 60,
    minimum: 1,
    maximum: 3600,
    default: 60,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3600)
  durationSeconds?: number = 60;
}
