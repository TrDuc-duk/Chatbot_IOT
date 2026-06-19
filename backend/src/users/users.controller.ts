import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import {
  UpdateUserDto,
  UpdatePasswordDto,
  AdminUpdateUserDto,
} from './dto/update-user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { CurrentUserData } from '../common/types/auth.types';

/**
 * UsersController - Quản lý người dùng
 * Bao gồm: Profile cá nhân, quản lý users (Admin)
 */
@ApiTags('Người dùng (Users)')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==========================================
  // NGƯỜI DÙNG - QUẢN LÝ PROFILE CÁ NHÂN
  // ==========================================

  /**
   * GET /api/users/profile
   * Lấy profile của user đang đăng nhập
   */
  @Get('profile')
  @ApiOperation({
    summary: 'Lấy profile cá nhân',
    description: 'Trả về thông tin chi tiết của người dùng đang đăng nhập',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về thông tin profile',
  })
  async getProfile(@CurrentUser() user: CurrentUserData) {
    return this.usersService.findById(user.id);
  }

  /**
   * PUT /api/users/profile
   * Cập nhật profile
   */
  @Put('profile')
  @ApiOperation({
    summary: 'Cập nhật profile',
    description: 'Cập nhật thông tin cá nhân: username, email',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cập nhật profile thành công',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email hoặc username đã tồn tại',
  })
  async updateProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  /**
   * POST /api/users/change-password
   * Đổi mật khẩu
   */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đổi mật khẩu',
    description: 'Thay đổi mật khẩu tài khoản, cần nhập mật khẩu hiện tại',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Đổi mật khẩu thành công',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Mật khẩu hiện tại không đúng',
  })
  async changePassword(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, dto);
  }

  // ==========================================
  // ADMIN - QUẢN LÝ NGƯỜI DÙNG
  // ==========================================

  /**
   * GET /api/users
   * Lấy danh sách tất cả users
   */
  @Get()
  @Roles('admin')
  @ApiOperation({
    summary: 'Lấy danh sách người dùng',
    description:
      'Trả về danh sách tất cả người dùng trong hệ thống (chỉ Admin)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về danh sách users',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Không có quyền truy cập',
  })
  async findAll() {
    return this.usersService.findAll();
  }

  /**
   * GET /api/users/statistics
   * Lấy thống kê users
   */
  @Get('statistics')
  @Roles('admin')
  @ApiOperation({
    summary: 'Thống kê người dùng',
    description:
      'Trả về số liệu thống kê: tổng users, phân bố theo role, users mới',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về dữ liệu thống kê',
  })
  async getStatistics() {
    return this.usersService.getStatistics();
  }

  /**
   * POST /api/users
   * Tạo user mới
   */
  @Post()
  @Roles('admin')
  @ApiOperation({
    summary: 'Tạo người dùng mới',
    description: 'Admin tạo tài khoản người dùng mới, có thể gán role',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tạo user thành công',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email hoặc username đã tồn tại',
  })
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  /**
   * GET /api/users/:id
   * Lấy thông tin user theo ID
   */
  @Get(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Lấy thông tin người dùng',
    description: 'Trả về chi tiết người dùng theo ID (chỉ Admin)',
  })
  @ApiParam({ name: 'id', description: 'ID của người dùng', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về thông tin user',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy người dùng',
  })
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  /**
   * PUT /api/users/:id
   * Cập nhật thông tin user
   */
  @Put(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Cập nhật người dùng',
    description: 'Admin cập nhật thông tin, role của người dùng',
  })
  @ApiParam({ name: 'id', description: 'ID của người dùng', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cập nhật thành công',
  })
  async adminUpdateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.usersService.adminUpdateUser(id, dto);
  }

  /**
   * DELETE /api/users/:id
   * Xóa user
   */
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Xóa người dùng',
    description:
      'Xóa tài khoản người dùng khỏi hệ thống (không thể xóa chính mình)',
  })
  @ApiParam({ name: 'id', description: 'ID của người dùng', type: Number })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Xóa thành công',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Không thể xóa chính mình',
  })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.usersService.delete(id, user.id);
  }
}
