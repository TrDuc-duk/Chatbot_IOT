import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  JwtPayload,
  AuthTokens,
  AuthResponse,
} from '../common/types/auth.types';
import { RoleName } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Đăng ký user mới
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
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
    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Lấy role "user"
    const userRole = await this.prisma.role.findUnique({
      where: { roleName: 'user' },
    });

    if (!userRole) {
      throw new BadRequestException(
        'User role not found.  Please seed the database.',
      );
    }

    // Tạo user
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
        roleId: userRole.id,
      },
      include: { role: true },
    });

    this.logger.log(`👤 User registered:  ${user.username} (${user.email})`);

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role.roleName,
      type: 'access',
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.roleName,
      },
      tokens,
    };
  }

  /**
   * Đăng nhập
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    // Tìm user theo email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Kiểm tra password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    this.logger.log(`👤 User logged in: ${user.username}`);

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role.roleName,
      type: 'access',
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.roleName,
      },
      tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Kiểm tra user còn tồn tại
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { role: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new tokens
      return this.generateTokens({
        sub: user.id,
        username: user.username,
        email: user.email,
        role: user.role.roleName,
        type: 'access',
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Refresh token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Generate access và refresh tokens
   */
  private async generateTokens(
    payload: Omit<JwtPayload, 'type'> & { type?: 'access' | 'refresh' },
  ): Promise<AuthTokens> {
    const accessPayload = { ...payload, type: 'access' as const };
    const refreshPayload = { ...payload, type: 'refresh' as const };

    // Convert to seconds
    const accessExpiresInSeconds = 15 * 60; // 15 minutes
    const refreshExpiresInSeconds = 7 * 24 * 60 * 60; // 7 days

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...accessPayload },
        {
          secret: this.configService.get<string>('jwt.accessSecret'),
          expiresIn: accessExpiresInSeconds,
        },
      ),
      this.jwtService.signAsync(
        { ...refreshPayload },
        {
          secret: this.configService.get<string>('jwt.refreshSecret'),
          expiresIn: refreshExpiresInSeconds,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresInSeconds,
    };
  }

  /**
   * Parse JWT expiresIn string to seconds
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return 900; // default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 900;
    }
  }

  /**
   * Hash password (utility method)
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare password (utility method)
   */
  async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
