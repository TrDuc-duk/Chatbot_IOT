import { PartialType } from '@nestjs/swagger';
import { CreatePlantDto } from './create-plant.dto';

/**
 * DTO cập nhật thông tin cây trồng
 * Kế thừa tất cả các trường từ CreatePlantDto nhưng đều optional
 */
export class UpdatePlantDto extends PartialType(CreatePlantDto) {}
