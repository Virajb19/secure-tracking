import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

/**
 * Metadata key for storing required roles.
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator to specify which roles can access an endpoint.
 * Used in conjunction with RolesGuard for role-based access control.
 * 
 * @example
 * @Roles(UserRole.ADMIN)
 * @Get('admin-only')
 * adminEndpoint() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
