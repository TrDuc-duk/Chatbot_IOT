import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, RefreshTokenDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../common/types/auth.types';

/**
 * AuthController - Quản lý xác thực người dùng
 * Bao gồm: Đăng ký, Đăng nhập, Refresh token, Thông tin user
 */
@ApiTags('Xác thực (Auth)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/register
   * Đăng ký tài khoản mới
   */
  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Đăng ký tài khoản mới',
    description: 'Tạo tài khoản người dùng mới với username, email và password',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Đăng ký thành công, trả về thông tin user và tokens',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email hoặc username đã tồn tại trong hệ thống',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dữ liệu không hợp lệ (thiếu field, sai format)',
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /api/auth/login
   * Đăng nhập vào hệ thống
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập',
    description:
      'Xác thực người dùng bằng email và password, trả về access token và refresh token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Đăng nhập thành công',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Email hoặc mật khẩu không đúng',
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /api/auth/refresh
   * Làm mới access token
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Làm mới Access Token',
    description:
      'Sử dụng refresh token để lấy cặp tokens mới khi access token hết hạn',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Làm mới token thành công, trả về cặp tokens mới',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Refresh token không hợp lệ hoặc đã hết hạn',
  })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  /**
   * GET /api/auth/me
   * Lấy thông tin user hiện tại
   */
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy thông tin người dùng hiện tại',
    description:
      'Trả về thông tin của user đang đăng nhập (yêu cầu access token)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về thông tin user: id, username, email, role',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Chưa đăng nhập hoặc token không hợp lệ',
  })
  async getCurrentUser(@CurrentUser() user: CurrentUserData) {
    return user;
  }
}
