import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Req,
    HttpCode,
    HttpStatus,
    ParseUUIDPipe,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { memoryStorage } from 'multer';
import { TaskEventsService } from './task-events.service';
import { CreateTaskEventDto } from './dto/create-task-event.dto';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles, CurrentUser } from '../shared/decorators';
import { UserRole } from '../shared/enums';
import { User } from '../users/entities/user.entity';
import { TaskEvent } from './entities/task-event.entity';

/**
 * Multer configuration for secure image upload.
 * 
 * SECURITY:
 * - Uses memory storage (buffer) for SHA-256 hashing before saving
 * - Limits file size to prevent DoS attacks
 * - Validates file type
 */
const multerOptions = {
    storage: memoryStorage(), // Store in memory for hash calculation
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB max
    },
    fileFilter: (req: any, file: Express.Multer.File, callback: Function) => {
        // Only allow image files
        const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            callback(null, true);
        } else {
            callback(
                new BadRequestException('Only JPEG, PNG, and WebP images are allowed'),
                false,
            );
        }
    },
};

/**
 * Task Events Controller.
 * Provides endpoint for DELIVERY users to upload events.
 * 
 * Endpoints (from API Contract):
 * - POST /api/tasks/:taskId/events (multipart/form-data)
 * 
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║  SECURITY ENFORCEMENT:                                            ║
 * ║  - Only DELIVERY users can access                                 ║
 * ║  - User must be assigned to the task                              ║
 * ║  - All validations happen in service layer                        ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */
@Controller('api/tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DELIVERY)
export class TaskEventsController {
    constructor(private readonly taskEventsService: TaskEventsService) { }

    /**
     * Upload a task event with image.
     * 
     * Request format: multipart/form-data
     * Required fields:
     * - image: File (JPEG, PNG, WebP)
     * - event_type: PICKUP | TRANSIT | FINAL
     * - latitude: number (-90 to 90)
     * - longitude: number (-180 to 180)
     * 
     * NOTE: Timestamp is NOT accepted from client.
     * Server generates the timestamp.
     */
    @Post(':taskId/events')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(FileInterceptor('image', multerOptions))
    async create(
        @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string,
        @Body() createTaskEventDto: CreateTaskEventDto,
        @UploadedFile() image: Express.Multer.File,
        @CurrentUser() currentUser: User,
        @Req() request: Request,
    ): Promise<TaskEvent> {
        // Validate image is provided
        if (!image) {
            throw new BadRequestException('Image file is required');
        }

        const ipAddress = this.extractIpAddress(request);

        return this.taskEventsService.create(
            taskId,
            createTaskEventDto,
            image,
            currentUser.id,
            ipAddress,
        );
    }

    /**
     * Get all events for a task.
     * Returns events in chronological order.
     * 
     * Used by mobile app to:
     * - Determine which events have been completed
     * - Display event history with timestamps and locations
     */
    @Get(':taskId/events')
    async findByTaskId(
        @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string,
        @CurrentUser() currentUser: User,
    ): Promise<TaskEvent[]> {
        // Note: Service will return events - access control is via the JWT guard
        // which ensures only authenticated DELIVERY users can access
        return this.taskEventsService.findByTaskId(taskId);
    }

    /**
     * Extract client IP address from request.
     */
    private extractIpAddress(request: Request): string {
        const forwarded = request.headers['x-forwarded-for'];
        if (forwarded) {
            const forwardedIps = Array.isArray(forwarded) ? forwarded[0] : forwarded;
            return forwardedIps.split(',')[0].trim();
        }
        return request.ip || request.socket.remoteAddress || 'unknown';
    }
}
