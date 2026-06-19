import { IsString, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO đăng nhập
 */
export class LoginDto {
  @ApiProperty({
    description: 'Địa chỉ email đăng ký',
    example: 'john@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Mật khẩu',
    example: 'password123',
  })
  @IsString()
  @MinLength(1)
  password: string;
}

/**
 * DTO làm mới token
 */
export class RefreshTokenDto {
  @ApiProperty({
    description: 'Token làm mới (refresh token)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  refreshToken: string;
}
