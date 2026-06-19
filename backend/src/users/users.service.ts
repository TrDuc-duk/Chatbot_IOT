import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import {
  UpdateUserDto,
  UpdatePasswordDto,
  AdminUpdateUserDto,
} from './dto/update-user.dto';
import { User, RoleName } from '@prisma/client';

// Exclude password from response
type UserWithoutPassword = Omit<User, 'password'> & {
  role: { roleName: RoleName };
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  /**
   * Tạo user mới (Admin only)
   */
  async create(dto: CreateUserDto): Promise<UserWithoutPassword> {
    // Kiểm tra email đã tồn tại
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Kiểm tra username đã tồn tại
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    // Hash password
    const hashedPassword = await this.authService.hashPassword(dto.password);

    // Lấy role
    const role = await this.prisma.role.findUnique({
      where: { roleName: dto.role || 'user' },
    });

    if (!role) {
      throw new BadRequestException('Invalid role');
    }

    // Tạo user
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
        roleId: role.id,
      },
      include: { role: true },
    });

    this.logger.log(`👤 User created by admin: ${user.username}`);

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Lấy tất cả users (Admin only)
   */
  async findAll(): Promise<UserWithoutPassword[]> {
    const users = await this.prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });

    return users.map(({ password, ...user }) => user);
  }

  /**
   * Lấy user theo ID
   */
  async findById(id: number): Promise<UserWithoutPassword> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Cập nhật profile (User tự cập nhật)
   */
  async updateProfile(
    userId: number,
    dto: UpdateUserDto,
  ): Promise<UserWithoutPassword> {
    await this.findById(userId);

    // Kiểm tra email trùng
    if (dto.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          NOT: { id: userId },
        },
      });

      if (existingEmail) {
        throw new ConflictException('Email already in use');
      }
    }

    // Kiểm tra username trùng
    if (dto.username) {
      const existingUsername = await this.prisma.user.findFirst({
        where: {
          username: dto.username,
          NOT: { id: userId },
        },
      });

      if (existingUsername) {
        throw new ConflictException('Username already taken');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      include: { role: true },
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Đổi mật khẩu
   */
  async changePassword(
    userId: number,
    dto: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Kiểm tra current password
    const isPasswordValid = await this.authService.comparePassword(
      dto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await this.authService.hashPassword(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    this.logger.log(`🔐 Password changed for user ID: ${userId}`);

    return { message: 'Password changed successfully' };
  }

  /**
   * Admin cập nhật user
   */
  async adminUpdateUser(
    targetUserId: number,
    dto: AdminUpdateUserDto,
  ): Promise<UserWithoutPassword> {
    await this.findById(targetUserId);

    // Kiểm tra email trùng
    if (dto.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          NOT: { id: targetUserId },
        },
      });

      if (existingEmail) {
        throw new ConflictException('Email already in use');
      }
    }

    // Kiểm tra username trùng
    if (dto.username) {
      const existingUsername = await this.prisma.user.findFirst({
        where: {
          username: dto.username,
          NOT: { id: targetUserId },
        },
      });

      if (existingUsername) {
        throw new ConflictException('Username already taken');
      }
    }

    // Lấy roleId nếu có thay đổi role
    let roleId: number | undefined;
    if (dto.role) {
      const role = await this.prisma.role.findUnique({
        where: { roleName: dto.role },
      });
      if (!role) {
        throw new BadRequestException('Invalid role');
      }
      roleId = role.id;
    }

    const { role, ...updateData } = dto;

    const user = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...updateData,
        ...(roleId && { roleId }),
      },
      include: { role: true },
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Xóa user (Admin only)
   */
  async delete(targetUserId: number, currentUserId: number): Promise<void> {
    // Không thể tự xóa chính mình
    if (targetUserId === currentUserId) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    await this.findById(targetUserId);

    // Xóa user (cascade sẽ xóa gardens, logs, etc.)
    await this.prisma.user.delete({
      where: { id: targetUserId },
    });

    this.logger.log(`🗑️ User deleted:  ID ${targetUserId}`);
  }

  /**
   * Lấy thống kê user (Admin only)
   */
  async getStatistics(): Promise<{
    totalUsers: number;
    byRole: { role: string; count: number }[];
    recentRegistrations: number;
  }> {
    const [totalUsers, byRole, recentRegistrations] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({
        by: ['roleId'],
        _count: true,
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        },
      }),
    ]);

    // Get role names
    const roles = await this.prisma.role.findMany();
    const roleMap = new Map(roles.map((r) => [r.id, r.roleName]));

    return {
      totalUsers,
      byRole: byRole.map((item) => ({
        role: roleMap.get(item.roleId) || 'unknown',
        count: item._count,
      })),
      recentRegistrations,
    };
  }
}
