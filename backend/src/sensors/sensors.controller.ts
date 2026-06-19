import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SensorsService } from './sensors.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GardensService } from '../gardens/gardens.service';

/**
 * SensorsController - Quản lý dữ liệu cảm biến
 * Bao gồm: Lịch sử dữ liệu, thống kê từ cảm biến IoT
 */
@ApiTags('Cảm biến (Sensors)')
@ApiBearerAuth()
@Controller('gardens/:gardenId/sensors')
export class SensorsController {
  constructor(
    private readonly sensorsService: SensorsService,
    private readonly gardensService: GardensService,
  ) {}

  /**
   * GET /api/gardens/:gardenId/sensors/logs
   * Lấy sensor logs của garden
   */
  @Get('logs')
  @ApiOperation({
    summary: 'Lấy lịch sử dữ liệu cảm biến',
    description:
      'Trả về dữ liệu cảm biến của vườn theo khoảng thời gian (nhiệt độ, độ ẩm, ánh sáng, độ ẩm đất)',
  })
  @ApiParam({
    name: 'gardenId',
    description: 'ID của vườn',
    type: Number,
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Thời gian bắt đầu (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'Thời gian kết thúc (ISO 8601)',
    example: '2024-01-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số lượng bản ghi tối đa (mặc định: 500)',
    example: 100,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về danh sách dữ liệu cảm biến',
  })
  async getLogs(
    @Param('gardenId', ParseIntPipe) gardenId: number,
    @CurrentUser('id') userId: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    // Kiểm tra quyền truy cập garden
    await this.gardensService.findById(gardenId, userId);

    return this.sensorsService.getLogsByGarden(gardenId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * GET /api/gardens/:gardenId/sensors/latest
   * Lấy sensor logs mới nhất
   */
  @Get('latest')
  @ApiOperation({
    summary: 'Lấy dữ liệu cảm biến mới nhất',
    description: 'Trả về các bản ghi dữ liệu cảm biến gần nhất của vườn',
  })
  @ApiParam({
    name: 'gardenId',
    description: 'ID của vườn',
    type: Number,
  })
  @ApiQuery({
    name: 'count',
    required: false,
    description: 'Số lượng bản ghi (mặc định: 10)',
    example: 20,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về dữ liệu cảm biến mới nhất',
  })
  async getLatest(
    @Param('gardenId', ParseIntPipe) gardenId: number,
    @CurrentUser('id') userId: number,
    @Query('count') count?: string,
  ) {
    await this.gardensService.findById(gardenId, userId);

    return this.sensorsService.getLatestLogs(
      gardenId,
      count ? parseInt(count, 10) : 10,
    );
  }

  /**
   * GET /api/gardens/:gardenId/sensors/statistics
   * Lấy thống kê sensor
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Thống kê dữ liệu cảm biến',
    description:
      'Trả về thống kê min/max/avg các chỉ số cảm biến theo khoảng thời gian',
  })
  @ApiParam({
    name: 'gardenId',
    description: 'ID của vườn',
    type: Number,
  })
  @ApiQuery({
    name: 'from',
    required: true,
    description: 'Thời gian bắt đầu (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    description: 'Thời gian kết thúc (ISO 8601)',
    example: '2024-01-31T23:59:59Z',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về dữ liệu thống kê cảm biến',
  })
  async getStatistics(
    @Param('gardenId', ParseIntPipe) gardenId: number,
    @CurrentUser('id') userId: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    await this.gardensService.findById(gardenId, userId);

    return this.sensorsService.getStatistics(
      gardenId,
      new Date(from),
      new Date(to),
    );
  }
}
