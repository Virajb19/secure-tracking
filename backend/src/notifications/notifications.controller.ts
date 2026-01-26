import {
    Controller,
    Post,
    Get,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';

/**
 * NotificationsController
 * 
 * Handles:
 * - Saving push tokens from mobile app
 * - Getting notification history
 * - Marking notifications as read
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    /**
     * Save push token from mobile app
     * POST /api/notifications/push-token
     */
    @Post('push-token')
    async savePushToken(
        @Request() req: any,
        @Body() body: { push_token: string },
    ) {
        await this.notificationsService.savePushToken(req.user.id, body.push_token);
        return { success: true, message: 'Push token saved' };
    }

    /**
     * Remove push token (on logout)
     * POST /api/notifications/push-token/remove
     */
    @Post('push-token/remove')
    async removePushToken(@Request() req: any) {
        await this.notificationsService.removePushToken(req.user.id);
        return { success: true, message: 'Push token removed' };
    }

    /**
     * Get notification history for current user
     * GET /api/notifications?page=1&limit=20
     */
    @Get()
    async getNotifications(
        @Request() req: any,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '20',
    ) {
        return this.notificationsService.getUserNotifications(
            req.user.id,
            parseInt(page, 10),
            parseInt(limit, 10),
        );
    }

    /**
     * Get unread count
     * GET /api/notifications/unread-count
     */
    @Get('unread-count')
    async getUnreadCount(@Request() req: any) {
        const count = await this.notificationsService.getUnreadCount(req.user.id);
        return { unread_count: count };
    }

    /**
     * Mark notification as read
     * PATCH /api/notifications/:id/read
     */
    @Patch(':id/read')
    async markAsRead(
        @Request() req: any,
        @Param('id') notificationId: string,
    ) {
        await this.notificationsService.markAsRead(notificationId, req.user.id);
        return { success: true };
    }

    /**
     * Mark all notifications as read
     * PATCH /api/notifications/read-all
     */
    @Patch('read-all')
    async markAllAsRead(@Request() req: any) {
        await this.notificationsService.markAllAsRead(req.user.id);
        return { success: true };
    }
}
