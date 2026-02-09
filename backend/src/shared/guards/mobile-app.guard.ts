import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { MOBILE_APP_ROLES } from '../constants/role-permissions';

/**
 * Mobile App Access Guard.
 * 
 * Ensures that only mobile app roles (field users) can access mobile app endpoints.
 * Blocks CMS-only roles (SUBJECT_COORDINATOR, ASSISTANT) from mobile app APIs.
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, MobileAppGuard)
 * export class TasksController { ... }
 */
@Injectable()
export class MobileAppGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const { user } = context.switchToHttp().getRequest();

        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        if (!MOBILE_APP_ROLES.includes(user.role)) {
            throw new ForbiddenException(
                'This role cannot access mobile app features. Please use the Admin CMS.',
            );
        }

        return true;
    }
}
