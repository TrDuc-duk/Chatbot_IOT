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
 * DTO cập nhật thông tin người dùng
 */
export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Tên đăng nhập mới',
    example: 'johndoe',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới',
  })
  username?: string;

  @ApiPropertyOptional({
    description: 'Địa chỉ email mới',
    example: 'john@example.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;
}

/**
 * DTO đổi mật khẩu
 */
export class UpdatePasswordDto {
  @ApiProperty({
    description: 'Mật khẩu hiện tại',
    example: 'oldpassword123',
  })
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @ApiProperty({
    description: 'Mật khẩu mới (tối thiểu 6 ký tự)',
    example: 'newpassword123',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  newPassword: string;
}

/**
 * DTO cập nhật người dùng bởi Admin
 */
export class AdminUpdateUserDto extends UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Vai trò người dùng',
    enum: RoleName,
  })
  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;
}
