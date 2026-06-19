import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';

/**
 * DTO tạo người dùng mới (Admin)
 */
export class CreateUserDto {
  @ApiProperty({
    description: 'Tên đăng nhập (chỉ chứa chữ cái, số và dấu gạch dưới)',
    example: 'johndoe',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới',
  })
  username: string;

  @ApiProperty({
    description: 'Địa chỉ email',
    example: 'john@example.com',
  })
  @IsEmail()
  @MaxLength(100)
  email: string;

  @ApiProperty({
    description: 'Mật khẩu (tối thiểu 6 ký tự)',
    example: 'password123',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @ApiPropertyOptional({
    description: 'Vai trò người dùng (chỉ Admin được gán)',
    enum: RoleName,
    default: 'user',
  })
  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;
}
