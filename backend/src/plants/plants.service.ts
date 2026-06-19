import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { Plant } from '@prisma/client';

@Injectable()
export class PlantsService {
  private readonly logger = new Logger(PlantsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Tạo plant mới (Admin only)
   */
  async create(dto: CreatePlantDto, createdById?: number): Promise<Plant> {
    // Kiểm tra tên plant đã tồn tại chưa
    const existing = await this.prisma.plant.findFirst({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Plant with name "${dto.name}" already exists`,
      );
    }

    const plant = await this.prisma.plant.create({
      data: {
        ...dto,
        createdById,
      },
    });

    this.logger.log(`🌿 Plant created: ${plant.name} (ID: ${plant.id})`);

    return plant;
  }

  /**
   * Lấy tất cả plants
   */
  async findAll(): Promise<Plant[]> {
    return this.prisma.plant.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Lấy plant theo ID
   */
  async findById(id: number): Promise<Plant> {
    const plant = await this.prisma.plant.findUnique({
      where: { id },
    });

    if (!plant) {
      throw new NotFoundException(`Plant with ID ${id} not found`);
    }

    return plant;
  }

  /**
   * Cập nhật plant (Admin only)
   */
  async update(id: number, dto: UpdatePlantDto): Promise<Plant> {
    await this.findById(id);

    // Kiểm tra tên trùng (nếu đổi tên)
    if (dto.name) {
      const existing = await this.prisma.plant.findFirst({
        where: {
          name: dto.name,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Plant with name "${dto.name}" already exists`,
        );
      }
    }

    return this.prisma.plant.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Xóa plant (Admin only)
   */
  async delete(id: number): Promise<void> {
    await this.findById(id);

    // Kiểm tra có garden nào đang dùng plant này không
    const gardensUsingPlant = await this.prisma.garden.count({
      where: { plantId: id },
    });

    if (gardensUsingPlant > 0) {
      throw new ConflictException(
        `Cannot delete plant. ${gardensUsingPlant} garden(s) are using this plant. `,
      );
    }

    await this.prisma.plant.delete({
      where: { id },
    });

    this.logger.log(`🗑️ Plant deleted: ID ${id}`);
  }

  /**
   * Tìm kiếm plants theo tên
   */
  async search(query: string): Promise<Plant[]> {
    return this.prisma.plant.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
    });
  }
}
