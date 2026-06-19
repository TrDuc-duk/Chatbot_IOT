import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload, CurrentUserData } from '../../common/types/auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret =
      configService.get<string>('jwt.accessSecret') ||
      'default-secret-change-me';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });

    this.logger.log(
      `JwtStrategy initialized with secret: ${secret.substring(0, 10)}...`,
    );
  }

  /**
   * Validate JWT payload và trả về user data
   * Data này sẽ được attach vào request.user
   */
  async validate(payload: JwtPayload): Promise<CurrentUserData> {
    this.logger.log(`Validating JWT payload: ${JSON.stringify(payload)}`);

    // Kiểm tra token type
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Kiểm tra user còn tồn tại không
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const userData: CurrentUserData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role.roleName,
    };

    this.logger.log(`User validated: ${JSON.stringify(userData)}`);
    return userData;
  }
}
