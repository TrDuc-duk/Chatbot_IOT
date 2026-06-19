import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { Roles } from '../common/decorators/roles.decorator';

/**
 * DevicesController - Quản lý thiết bị ESP32
 * Chỉ Admin mới có quyền truy cập
 */
@ApiTags('Thiết bị (Devices)')
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  /**
   * GET /api/devices
   * Lấy danh sách tất cả devices
   */
  @Get()
  @Roles('admin')
  @ApiOperation({
    summary: 'Lấy danh sách tất cả thiết bị',
    description:
      'Trả về danh sách tất cả thiết bị ESP32 trong hệ thống (chỉ Admin)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về danh sách thiết bị',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Không có quyền truy cập (yêu cầu quyền Admin)',
  })
  async findAll() {
    return this.devicesService.findAll();
  }

  /**
   * GET /api/devices/:id
   * Lấy thông tin device theo ID
   */
  @Get(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Lấy thông tin thiết bị theo ID',
    description: 'Trả về chi tiết thiết bị ESP32 theo ID (chỉ Admin)',
  })
  @ApiParam({ name: 'id', description: 'ID của thiết bị', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về thông tin thiết bị',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy thiết bị với ID này',
  })
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.devicesService.findById(id);
  }

  /**
   * GET /api/devices/code/:deviceCode
   * Lấy thông tin device theo mã thiết bị
   */
  @Get('code/:deviceCode')
  @Roles('admin')
  @ApiOperation({
    summary: 'Lấy thông tin thiết bị theo mã',
    description: 'Tìm thiết bị ESP32 theo mã thiết bị (VD: ESP32_001)',
  })
  @ApiParam({
    name: 'deviceCode',
    description: 'Mã thiết bị (VD: ESP32_001)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về thông tin thiết bị',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy thiết bị với mã này',
  })
  async findByDeviceCode(@Param('deviceCode') deviceCode: string) {
    return this.devicesService.findByDeviceCode(deviceCode);
  }

  /**
   * GET /api/devices/:id/status
   * Kiểm tra trạng thái kết nối của device
   */
  @Get(':id/status')
  @Roles('admin')
  @ApiOperation({
    summary: 'Kiểm tra trạng thái kết nối thiết bị',
    description:
      'Kiểm tra thiết bị đang online hay offline, thời gian hoạt động cuối',
  })
  @ApiParam({ name: 'id', description: 'ID của thiết bị', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về trạng thái: isOnline, lastSeen',
  })
  async checkStatus(@Param('id', ParseIntPipe) id: number) {
    const device = await this.devicesService.findById(id);
    const isOnline = await this.devicesService.checkDeviceOnlineStatus(id);

    return {
      deviceId: id,
      deviceCode: device.deviceCode,
      isOnline,
      lastSeen: device.lastSeen,
    };
  }
}
