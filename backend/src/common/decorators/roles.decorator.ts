import { SetMetadata } from '@nestjs/common';
import { RoleName } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator để chỉ định roles được phép truy cập
 *
 * Usage:
 * @Roles('admin')
 * @Get('admin-only')
 * adminOnly() {
 *   return { message: 'Admin only' };
 * }
 *
 * @Roles('admin', 'user')
 * @Get('authenticated')
 * authenticated() {
 *   return { message: 'Authenticated users' };
 * }
 */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
