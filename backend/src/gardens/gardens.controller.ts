import {
  Controller,
  Get,
  Post,
  Put,
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
import { GardensService } from './gardens.service';
import { CreateGardenDto } from './dto/create-garden.dto';
import { UpdateGardenDto } from './dto/update-garden.dto';
import { PumpControlDto } from './dto/control-device.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentUserData } from '../common/types/auth.types';

/**
 * GardensController - Quản lý vườn cây
 * Bao gồm: CRUD vườn, điều khiển thiết bị (bơm, đèn), xem trạng thái
 */
@ApiTags('Vườn cây (Gardens)')
@ApiBearerAuth()
@Controller('gardens')
export class GardensController {
  constructor(private readonly gardensService: GardensService) {}

  // ==========================================
  // CRUD - QUẢN LÝ VƯỜN
  // ==========================================

  /**
   * POST /api/gardens
   * Tạo vườn mới
   */
  @Post()
  @ApiOperation({
    summary: 'Tạo vườn mới',
    description:
      'Tạo một vườn cây mới và có thể gán thiết bị ESP32, loại cây trồng',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tạo vườn thành công',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Thiết bị đã được gán cho vườn khác',
  })
  async create(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateGardenDto,
  ) {
    return this.gardensService.create(userId, dto);
  }

  /**
   * GET /api/gardens
   * Lấy danh sách vườn của user
   */
  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách vườn',
    description: 'Trả về tất cả các vườn thuộc sở hữu của người dùng hiện tại',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về danh sách vườn',
  })
  async findAll(@CurrentUser('id') userId: number) {
    return this.gardensService.findAllByUser(userId);
  }

  /**
   * GET /api/gardens/:id
   * Lấy chi tiết vườn theo ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết vườn',
    description:
      'Trả về thông tin chi tiết của vườn bao gồm thiết bị, cây trồng',
  })
  @ApiParam({ name: 'id', description: 'ID của vườn', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về thông tin vườn',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy vườn hoặc không có quyền truy cập',
  })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.gardensService.findById(id, userId);
  }

  /**
   * PUT /api/gardens/:id
   * Cập nhật thông tin vườn
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật vườn',
    description: 'Cập nhật tên, mô tả, chế độ tưới, ngưỡng cảnh báo của vườn',
  })
  @ApiParam({ name: 'id', description: 'ID của vườn', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cập nhật thành công',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy vườn',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateGardenDto,
  ) {
    return this.gardensService.update(id, userId, dto);
  }

  /**
   * DELETE /api/gardens/:id
   * Xóa vườn
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Xóa vườn',
    description: 'Xóa vườn và toàn bộ dữ liệu liên quan (logs, schedules)',
  })
  @ApiParam({ name: 'id', description: 'ID của vườn', type: Number })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Xóa thành công',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy vườn',
  })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    await this.gardensService.delete(id, userId);
  }

  // ==========================================
  // ĐIỀU KHIỂN THIẾT BỊ
  // ==========================================

  /**
   * POST /api/gardens/:id/pump/on
   * Bật máy bơm
   */
  @Post(':id/pump/on')
  @ApiOperation({
    summary: 'Bật máy bơm',
    description:
      'Gửi lệnh bật máy bơm tưới cây, có thể chỉ định thời gian (giây)',
  })
  @ApiParam({ name: 'id', description: 'ID của vườn', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Đã gửi lệnh bật bơm thành công',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Thiết bị offline hoặc chưa được gán',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Máy bơm đang chạy',
  })
  async turnPumpOn(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body() dto: PumpControlDto,
  ) {
    return this.gardensService.turnPumpOn(id, userId, dto.durationSeconds);
  }

  /**
   * POST /api/gardens/:id/pump/off
   * Tắt máy bơm
   */
  @Post(':id/pump/off')
  @ApiOperation({
    summary: 'Tắt máy bơm',
    description: 'Gửi lệnh tắt máy bơm ngay lập tức',
  })
  @ApiParam({ name: 'id', description: 'ID của vườn', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Đã gửi lệnh tắt bơm thành công',
  })
  async turnPumpOff(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.gardensService.turnPumpOff(id, userId);
  }

  /**
   * POST /api/gardens/:id/led/on
   * Bật đèn LED
   */
  @Post(':id/led/on')
  @ApiOperation({
    summary: 'Bật đèn LED',
    description: 'Gửi lệnh bật đèn LED chiếu sáng cho cây',
  })
  @ApiParam({ name: 'id', description: 'ID của vườn', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Đã gửi lệnh bật đèn thành công',
  })
  async turnLedOn(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.gardensService.turnLedOn(id, userId);
  }

  /**
   * POST /api/gardens/:id/led/off
   * Tắt đèn LED
   */
  @Post(':id/led/off')
  @ApiOperation({
    summary: 'Tắt đèn LED',
    description: 'Gửi lệnh tắt đèn LED',
  })
  @ApiParam({ name: 'id', description: 'ID của vườn', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Đã gửi lệnh tắt đèn thành công',
  })
  async turnLedOff(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.gardensService.turnLedOff(id, userId);
  }

  // ==========================================
  // TRẠNG THÁI THỜI GIAN THỰC
  // ==========================================

  /**
   * GET /api/gardens/:id/status
   * Lấy trạng thái real-time của vườn
   */
  @Get(':id/status')
  @ApiOperation({
    summary: 'Lấy trạng thái vườn',
    description:
      'Trả về dữ liệu cảm biến real-time, trạng thái bơm/đèn, cảnh báo',
  })
  @ApiParam({ name: 'id', description: 'ID của vườn', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về trạng thái: nhiệt độ, độ ẩm, trạng thái thiết bị',
  })
  async getStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.gardensService.getGardenStatus(id, userId);
  }
}
