import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

/**
 * Center Superintendent Guard.
 * 
 * Ensures that non-admin users (HEADMASTER, TEACHER) can only access
 * Question Paper Tracking related endpoints if they have been assigned
 * as a Center Superintendent (is_center_superintendent = true).
 * 
 * Admin and Super Admin users bypass this check entirely.
 * 
 * Must be used AFTER JwtAuthGuard to have access to the user object.
 */
@Injectable()
export class CenterSuperintendentGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const { user } = context.switchToHttp().getRequest();

        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        // Admins bypass this check — they manage exam centers/schedules
        if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
            return true;
        }

        // For HEADMASTER / TEACHER / CENTER_SUPERINTENDENT roles,
        // the user must have is_center_superintendent flag set to true
        if (!user.is_center_superintendent) {
            throw new ForbiddenException(
                'Access denied. You must be assigned as a Center Superintendent to access Question Paper Tracking features. Contact your admin.',
            );
        }

        return true;
    }
}
