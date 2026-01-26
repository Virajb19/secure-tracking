import {
    Controller,
    Get,
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
    @Roles(UserRole.HEADMASTER, UserRole.TEACHER, UserRole.CENTER_SUPERINTENDENT)
    async getNotices(@CurrentUser() user: User) {
        return this.noticesService.getNotices(user.id);
    }

    /**
     * GET /notices/:id
     * Get a single notice by ID.
     */
    @Get(':id')
    @Roles(UserRole.HEADMASTER, UserRole.TEACHER, UserRole.CENTER_SUPERINTENDENT)
    async getNoticeById(@Param('id') noticeId: string) {
        return this.noticesService.getNoticeById(noticeId);
    }
}
