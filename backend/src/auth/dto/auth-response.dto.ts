import { ApiProperty } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';

/**
 * DTO thông tin người dùng trong response
 */
export class UserResponseDto {
  @ApiProperty({ example: 1, description: 'ID người dùng' })
  id: number;

  @ApiProperty({ example: 'johndoe', description: 'Tên đăng nhập' })
  username: string;

  @ApiProperty({ example: 'john@example.com', description: 'Địa chỉ email' })
  email: string;

  @ApiProperty({ enum: RoleName, example: 'user', description: 'Vai trò' })
  role: RoleName;
}

/**
 * DTO thông tin token trong response
 */
export class TokensResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token truy cập API (hết hạn sau 15 phút)',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token làm mới (hết hạn sau 7 ngày)',
  })
  refreshToken: string;

  @ApiProperty({
    example: 900,
    description: 'Thời gian hết hạn của access token (giây)',
  })
  expiresIn: number;
}

/**
 * DTO response khi đăng nhập/đăng ký thành công
 */
export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto, description: 'Thông tin người dùng' })
  user: UserResponseDto;

  @ApiProperty({ type: TokensResponseDto, description: 'Các token xác thực' })
  tokens: TokensResponseDto;
}
