import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PlantsService } from './plants.service';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUserData } from '../common/types/auth.types';

/**
 * PlantsController - Quản lý cây trồng
 * Bao gồm: Danh mục cây trồng, thông tin chăm sóc
 */
@ApiTags('Cây trồng (Plants)')
@Controller('plants')
export class PlantsController {
  constructor(private readonly plantsService: PlantsService) {}

  /**
   * POST /api/plants
   * Tạo plant mới (Admin only)
   */
  @Post()
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo cây trồng mới',
    description:
      'Thêm loại cây trồng vào hệ thống với thông số chăm sóc (chỉ Admin)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tạo cây trồng thành công',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Không có quyền truy cập',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Tên cây trồng đã tồn tại',
  })
  async create(@Body() dto: CreatePlantDto, @CurrentUser('id') userId: number) {
    return this.plantsService.create(dto, userId);
  }

  /**
   * GET /api/plants
   * Lấy tất cả plants (Public - không cần auth)
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'Lấy danh sách cây trồng',
    description:
      'Trả về tất cả các loại cây trồng trong hệ thống (không cần đăng nhập)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về danh sách cây trồng',
  })
  async findAll() {
    return this.plantsService.findAll();
  }

  /**
   * GET /api/plants/search?q=keyword
   * Tìm kiếm plants (Public)
   */
  @Get('search')
  @Public()
  @ApiOperation({
    summary: 'Tìm kiếm cây trồng',
    description: 'Tìm kiếm cây trồng theo tên hoặc mô tả',
  })
  @ApiQuery({
    name: 'q',
    description: 'Từ khóa tìm kiếm',
    required: true,
    example: 'cà chua',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về danh sách cây trồng phù hợp',
  })
  async search(@Query('q') query: string) {
    return this.plantsService.search(query || '');
  }

  /**
   * GET /api/plants/:id
   * Lấy plant theo ID (Public)
   */
  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Lấy thông tin cây trồng',
    description: 'Trả về chi tiết cây trồng theo ID bao gồm thông số chăm sóc',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của cây trồng',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về thông tin cây trồng',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy cây trồng',
  })
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.plantsService.findById(id);
  }

  /**
   * PUT /api/plants/:id
   * Cập nhật plant (Admin only)
   */
  @Put(':id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cập nhật cây trồng',
    description: 'Chỉnh sửa thông tin cây trồng (chỉ Admin)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của cây trồng',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cập nhật thành công',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Không có quyền truy cập',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlantDto,
  ) {
    return this.plantsService.update(id, dto);
  }

  /**
   * DELETE /api/plants/:id
   * Xóa plant (Admin only)
   */
  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Xóa cây trồng',
    description:
      'Xóa cây trồng khỏi hệ thống (không thể xóa nếu đang được sử dụng)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của cây trồng',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Xóa thành công',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Không có quyền truy cập',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Cây trồng đang được sử dụng, không thể xóa',
  })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.plantsService.delete(id);
  }
}
