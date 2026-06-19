import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserData } from '../types/auth.types';

/**
 * Decorator để lấy current user từ request
 *
 * Usage:
 * @Get('profile')
 * getProfile(@CurrentUser() user: CurrentUserData) {
 *   return user;
 * }
 *
 * // Lấy một field cụ thể
 * @Get('my-id')
 * getMyId(@CurrentUser('id') userId: number) {
 *   return userId;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserData;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
