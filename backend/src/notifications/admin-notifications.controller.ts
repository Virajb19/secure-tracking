import {
    Controller,
    Post,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles } from '../shared/decorators';
import { NotificationsService, NotificationType } from './notifications.service';
import { PrismaService } from '../prisma';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuid } from 'uuid';
import { existsSync, mkdirSync } from 'fs';

// Ensure uploads directory exists
const uploadsDir = join(process.cwd(), 'uploads', 'notifications');
if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
        const uniqueName = `${uuid()}${extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

// File filter for images and PDFs
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only images and PDF files are allowed'), false);
    }
};

interface SendNotificationDto {
    user_ids: string[];
    title: string;
    message: string;
    type: string;
    file_url?: string;
    file_name?: string;
}

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminNotificationsController {
    constructor(
        private readonly notificationsService: NotificationsService,
        private readonly db: PrismaService,
    ) {}

    /**
     * Send notification to specific users
     * POST /admin/notifications/send
     */
    @Post('send')
    @UseInterceptors(FileInterceptor('file', { 
        storage,
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }))
    async sendNotification(
        @Body() body: SendNotificationDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        const { user_ids, title, message, type, file_url, file_name } = body;

        // Parse user_ids if it's a string (from FormData)
        const userIds = typeof user_ids === 'string' ? JSON.parse(user_ids) : user_ids;

        // Build notification data with optional file info
        const data: Record<string, string> = {};
        
        // If file was uploaded via backend
        if (file) {
            const fileUrl = `/uploads/notifications/${file.filename}`;
            data.file_url = fileUrl;
            data.file_name = file.originalname;
        }
        // If file was uploaded via Appwrite (frontend)
        else if (file_url) {
            data.file_url = file_url;
            if (file_name) data.file_name = file_name;
        }

        // Map notification type string to enum
        const notificationType = this.mapNotificationType(type);

        // Send notifications to all specified users
        const result = await this.notificationsService.sendToUsers(
            userIds,
            title,
            message,
            notificationType,
            Object.keys(data).length > 0 ? data : undefined,
        );

        return {
            success: true,
            message: `Notification sent to ${result.success} users`,
            details: {
                total: userIds.length,
                success: result.success,
                failed: result.failed,
            },
        };
    }

    /**
     * Map notification type string to enum
     */
    private mapNotificationType(type: string): NotificationType {
        const typeMap: Record<string, NotificationType> = {
            'General': NotificationType.GENERAL,
            'Paper Setter': NotificationType.PAPER_SETTER_INVITE,
            'Paper Checker': NotificationType.GENERAL, // Map to general for now
            'Invitation': NotificationType.GENERAL,
            'Push Notification': NotificationType.GENERAL,
        };
        return typeMap[type] || NotificationType.GENERAL;
    }
}
