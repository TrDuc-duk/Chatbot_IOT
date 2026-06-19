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
import { IrrigationService } from './irrigation.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GardensService } from '../gardens/gardens.service';

/**
 * IrrigationController - Quản lý tưới tiêu
 * Bao gồm: Trạng thái tưới, lịch sử tưới, thống kê
 */
@ApiTags('Tưới tiêu (Irrigation)')
@ApiBearerAuth()
@Controller('gardens/:gardenId/irrigation')
export class IrrigationController {
  constructor(
    private readonly irrigationService: IrrigationService,
    private readonly gardensService: GardensService,
  ) {}

  /**
   * GET /api/gardens/:gardenId/irrigation/status
   * Lấy trạng thái tưới hiện tại
   */
  @Get('status')
  @ApiOperation({
    summary: 'Lấy trạng thái tưới tiêu',
    description:
      'Trả về trạng thái hiện tại của hệ thống tưới (bật/tắt, tự động/thủ công)',
  })
  @ApiParam({
    name: 'gardenId',
    description: 'ID của vườn',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về trạng thái tưới tiêu',
  })
  async getStatus(
    @Param('gardenId', ParseIntPipe) gardenId: number,
    @CurrentUser('id') userId: number,
  ) {
    await this.gardensService.findById(gardenId, userId);
    return this.irrigationService.getCurrentStatus(gardenId);
  }

  /**
   * GET /api/gardens/:gardenId/irrigation/logs
   * Lấy lịch sử tưới
   */
  @Get('logs')
  @ApiOperation({
    summary: 'Lấy lịch sử tưới tiêu',
    description: 'Trả về lịch sử các lần tưới của vườn theo khoảng thời gian',
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
    description: 'Số lượng bản ghi tối đa (mặc định: 100)',
    example: 50,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về lịch sử tưới tiêu',
  })
  async getLogs(
    @Param('gardenId', ParseIntPipe) gardenId: number,
    @CurrentUser('id') userId: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    await this.gardensService.findById(gardenId, userId);

    return this.irrigationService.getLogsByGarden(gardenId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * GET /api/gardens/:gardenId/irrigation/statistics
   * Lấy thống kê tưới
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Thống kê tưới tiêu',
    description:
      'Trả về thống kê: tổng lượng nước, số lần tưới, thời gian tưới theo khoảng thời gian',
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
    description: 'Trả về dữ liệu thống kê tưới tiêu',
  })
  async getStatistics(
    @Param('gardenId', ParseIntPipe) gardenId: number,
    @CurrentUser('id') userId: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    await this.gardensService.findById(gardenId, userId);

    return this.irrigationService.getStatistics(
      gardenId,
      new Date(from),
      new Date(to),
    );
  }
}
