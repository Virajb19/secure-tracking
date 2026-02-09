import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { CMS_ROLES, canAccessCmsTab } from '../constants/role-permissions';

/**
 * Metadata key for storing the required CMS tab.
 */
export const CMS_TAB_KEY = 'cms_tab';

/**
 * CMS Access Guard.
 * 
 * Enforces two levels of access control:
 * 1. Role must be a CMS role (not a mobile-app-only role)
 * 2. If a @CmsTab decorator is present, the role must have access to that tab
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, CmsAccessGuard)
 * @CmsTab('users')
 * export class UsersController { ... }
 */
@Injectable()
export class CmsAccessGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const { user } = context.switchToHttp().getRequest();

        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        // Block mobile-app-only roles from CMS endpoints
        if (!CMS_ROLES.includes(user.role)) {
            throw new ForbiddenException(
                'This role cannot access the Admin CMS. Please use the mobile app.',
            );
        }

        // Check tab-level permission if @CmsTab decorator is present
        const requiredTab = this.reflector.getAllAndOverride<string>(CMS_TAB_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (requiredTab) {
            const hasTabAccess = canAccessCmsTab(user.role as UserRole, requiredTab);

            if (!hasTabAccess) {
                throw new ForbiddenException(
                    `Access denied. Your role does not have permission to access the ${requiredTab} section.`,
                );
            }
        }

        return true;
    }
}
