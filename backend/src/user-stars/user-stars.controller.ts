import {
    Controller,
    Get,
    Post,
    Param,
    UseGuards,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles, CurrentUser } from '../shared/decorators';
import { UserStarsService } from './user-stars.service';

/**
 * User Stars Controller
 * 
 * Endpoints for admin to bookmark/star users.
 */
@Controller('admin/user-stars')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUBJECT_COORDINATOR, UserRole.ASSISTANT)
export class UserStarsController {
    constructor(private readonly userStarsService: UserStarsService) { }

    /**
     * Toggle star for a user
     * POST /api/admin/user-stars/toggle/:userId
     */
    @Post('toggle/:userId')
    async toggleStar(
        @CurrentUser() admin: User,
        @Param('userId') userId: string,
    ) {
        return this.userStarsService.toggleStar(admin.id, userId);
    }

    /**
     * Get all starred users
     * GET /api/admin/user-stars
     */
    @Get()
    async getStarredUsers(@CurrentUser() admin: User) {
        return this.userStarsService.getStarredUsers(admin.id);
    }

    /**
     * Get starred user IDs (for quick lookup)
     * GET /api/admin/user-stars/ids
     */
    @Get('ids')
    async getStarredUserIds(@CurrentUser() admin: User) {
        const ids = await this.userStarsService.getStarredUserIds(admin.id);
        return { starred_user_ids: ids };
    }
}
