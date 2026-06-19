import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

/**
 * AppController - API gốc của ứng dụng
 * Health check và thông tin cơ bản
 */
@ApiTags('Hệ thống (System)')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Health Check',
    description: 'Kiểm tra trạng thái hoạt động của API server',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Server đang hoạt động bình thường',
    schema: {
      type: 'string',
      example: 'Smart Garden API is running!',
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
