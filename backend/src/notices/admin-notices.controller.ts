import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles, CurrentUser } from '../shared/decorators';
import { AdminNoticesService } from './admin-notices.service';
import { CreateNoticeDto, UpdateNoticeDto, SendNoticeDto } from './dto/notice.dto';

@Controller('admin/notices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminNoticesController {
    constructor(private readonly adminNoticesService: AdminNoticesService) {}

    /**
     * GET /admin/notices
     * Get all notices with optional filters and pagination.
     */
    @Get()
    async getAllNotices(
        @Query('priority') priority?: string,
        @Query('is_active') isActive?: string,
        @Query('school_id') schoolId?: string,
        @Query('type') type?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.adminNoticesService.getAllNotices({
            priority,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            schoolId,
            type,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        });
    }

    /**
     * GET /admin/notices/:id
     * Get a single notice by ID.
     */
    @Get(':id')
    async getNoticeById(@Param('id') noticeId: string) {
        return this.adminNoticesService.getNoticeById(noticeId);
    }

    /**
     * POST /admin/notices
     * Create a new notice.
     */
    @Post()
    async createNotice(@Body() createNoticeDto: CreateNoticeDto) {
        return this.adminNoticesService.createNotice(createNoticeDto);
    }

    /**
     * PATCH /admin/notices/:id
     * Update an existing notice.
     */
    @Patch(':id')
    async updateNotice(
        @Param('id') noticeId: string,
        @Body() updateNoticeDto: UpdateNoticeDto,
    ) {
        return this.adminNoticesService.updateNotice(noticeId, updateNoticeDto);
    }

    /**
     * DELETE /admin/notices/:id
     * Delete a notice.
     */
    @Delete(':id')
    async deleteNotice(@Param('id') noticeId: string) {
        return this.adminNoticesService.deleteNotice(noticeId);
    }

    /**
     * PATCH /admin/notices/:id/toggle-active
     * Toggle the active status of a notice.
     */
    @Patch(':id/toggle-active')
    async toggleActive(@Param('id') noticeId: string) {
        return this.adminNoticesService.toggleActive(noticeId);
    }

    /**
     * POST /admin/notices/send
     * Send a notice to specific users (creates a global notice visible to selected users).
     */
    @Post('send')
    async sendNotice(
        @Body() sendNoticeDto: SendNoticeDto,
        @CurrentUser() user: User,
    ) {
        return this.adminNoticesService.sendNotice(sendNoticeDto, user.id);
    }
}
