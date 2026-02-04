import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    UseGuards,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles, CurrentUser } from '../shared/decorators';
import { NoticesService } from './notices.service';

@Controller('notices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NoticesController {
    constructor(private readonly noticesService: NoticesService) {}

    /**
     * GET /notices
     * Get all active notices.
     */
    @Get()
    @Roles(UserRole.HEADMASTER, UserRole.TEACHER, UserRole.CENTER_SUPERINTENDENT, UserRole.SEBA_OFFICER)
    async getNotices(@CurrentUser() user: User) {
        return this.noticesService.getNotices(user.id);
    }

    /**
     * GET /notices/:id
     * Get a single notice by ID.
     */
    @Get(':id')
    @Roles(UserRole.HEADMASTER, UserRole.TEACHER, UserRole.CENTER_SUPERINTENDENT, UserRole.SEBA_OFFICER)
    async getNoticeById(@Param('id') noticeId: string) {
        return this.noticesService.getNoticeById(noticeId);
    }

    /**
     * PATCH /notices/:id/read
     * Mark a targeted notice as read.
     */
    @Patch(':id/read')
    @Roles(UserRole.HEADMASTER, UserRole.TEACHER, UserRole.CENTER_SUPERINTENDENT, UserRole.SEBA_OFFICER)
    async markNoticeAsRead(
        @Param('id') noticeId: string,
        @CurrentUser() user: User,
    ) {
        return this.noticesService.markNoticeAsRead(noticeId, user.id);
    }

    /**
     * POST /notices/:id/accept
     * Accept a Paper Setter/Checker notice.
     * Requires teacher to have bank details on file.
     */
    @Post(':id/accept')
    @Roles(UserRole.TEACHER)
    async acceptNotice(
        @Param('id') noticeId: string,
        @CurrentUser() user: User,
    ) {
        return this.noticesService.acceptNotice(noticeId, user.id);
    }
}
