import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO đăng ký tài khoản mới
 */
export class RegisterDto {
  @ApiProperty({
    description: 'Tên đăng nhập (chỉ chứa chữ cái, số và dấu gạch dưới)',
    example: 'johndoe',
    minLength: 3,
    maxLength: 50,
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
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;
}
