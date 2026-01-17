import {
    Injectable,
    BadRequestException,
    ForbiddenException,
    ConflictException,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { TaskEvent } from './entities/task-event.entity';
import { CreateTaskEventDto } from './dto/create-task-event.dto';
import { TasksService } from '../tasks/tasks.service';
import { AuditLogsService, AuditAction } from '../audit-logs/audit-logs.service';
import { TaskStatus, EventType } from '../shared/enums';

/**
 * Task Events Service.
 * 
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  GOVERNMENT-GRADE SECURITY IMPLEMENTATION                            ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  This service enforces ALL security rules for event recording:       ║
 * ║  1. Only assigned DELIVERY user can upload events                    ║
 * ║  2. Each event_type can only occur ONCE per task                     ║
 * ║  3. FINAL event locks task permanently (COMPLETED status)            ║
 * ║  4. Events outside time window mark task as SUSPICIOUS               ║
 * ║  5. Server generates timestamp (client timestamps are IGNORED)       ║
 * ║  6. Image hash (SHA-256) is calculated for integrity verification    ║
 * ║  7. NO UPDATE or DELETE operations are implemented                   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
@Injectable()
export class TaskEventsService {
    constructor(
        @InjectRepository(TaskEvent)
        private readonly taskEventRepository: Repository<TaskEvent>,
        @Inject(forwardRef(() => TasksService))
        private readonly tasksService: TasksService,
        private readonly auditLogsService: AuditLogsService,
    ) { }

    /**
     * Create a new task event with image upload.
     * 
     * CRITICAL SECURITY FLOW:
     * 1. Validate user is assigned to task
     * 2. Check task is not already COMPLETED
     * 3. Check event_type hasn't been recorded already
     * 4. Generate SHA-256 hash of image
     * 5. Check if current time is within allowed window
     * 6. Save event with server-generated timestamp
     * 7. Update task status accordingly
     * 8. Log to audit trail
     */
    async create(
        taskId: string,
        createDto: CreateTaskEventDto,
        imageFile: Express.Multer.File,
        userId: string,
        ipAddress: string | null,
    ): Promise<TaskEvent> {
        // ================================================================
        // STEP 1: Validate user is assigned to this task
        // ================================================================
        const task = await this.tasksService.findById(taskId);

        if (task.assigned_user_id !== userId) {
            await this.auditLogsService.log(
                'EVENT_UPLOAD_DENIED_NOT_ASSIGNED',
                'TaskEvent',
                null,
                userId,
                ipAddress,
            );
            throw new ForbiddenException('You are not assigned to this task');
        }

        // ================================================================
        // STEP 2: Check task is not already COMPLETED
        // ================================================================
        if (task.status === TaskStatus.COMPLETED) {
            await this.auditLogsService.log(
                AuditAction.EVENT_REJECTED_TASK_LOCKED,
                'TaskEvent',
                null,
                userId,
                ipAddress,
            );
            throw new BadRequestException(
                'Task is already completed. No more events can be recorded.',
            );
        }

        // ================================================================
        // STEP 3: Check event_type hasn't been recorded already
        // ================================================================
        const existingEvent = await this.taskEventRepository.findOne({
            where: {
                task_id: taskId,
                event_type: createDto.event_type,
            },
        });

        if (existingEvent) {
            await this.auditLogsService.log(
                AuditAction.EVENT_REJECTED_DUPLICATE,
                'TaskEvent',
                null,
                userId,
                ipAddress,
            );
            throw new ConflictException(
                `Event type '${createDto.event_type}' has already been recorded for this task`,
            );
        }

        // ================================================================
        // STEP 4: Validate image file exists
        // ================================================================
        if (!imageFile) {
            throw new BadRequestException('Image file is required');
        }

        // ================================================================
        // STEP 5: Calculate SHA-256 hash of image
        // ================================================================
        const imageHash = this.calculateSHA256(imageFile.buffer);

        // ================================================================
        // STEP 6: Generate server timestamp (CRITICAL - ignore client time)
        // ================================================================
        const serverTimestamp = new Date();

        // ================================================================
        // STEP 7: Check if event is within allowed time window
        // ================================================================
        const isWithinWindow = this.isWithinTimeWindow(
            serverTimestamp,
            task.start_time,
            task.end_time,
        );

        // ================================================================
        // STEP 8: Save image and get URL
        // ================================================================
        const imageUrl = await this.saveImage(imageFile, taskId, createDto.event_type);

        // ================================================================
        // STEP 9: Create event record (IMMUTABLE - no update method exists)
        // ================================================================
        const taskEvent = this.taskEventRepository.create({
            task_id: taskId,
            event_type: createDto.event_type,
            image_url: imageUrl,
            image_hash: imageHash,
            latitude: createDto.latitude,
            longitude: createDto.longitude,
            server_timestamp: serverTimestamp,
            // created_at is auto-generated
        });

        const savedEvent = await this.taskEventRepository.save(taskEvent);

        // ================================================================
        // STEP 10: Update task status based on event type and time window
        // ================================================================
        await this.updateTaskStatus(
            task,
            createDto.event_type,
            isWithinWindow,
            userId,
            ipAddress,
        );

        // ================================================================
        // STEP 11: Log successful event upload
        // ================================================================
        await this.auditLogsService.log(
            AuditAction.EVENT_UPLOADED,
            'TaskEvent',
            savedEvent.id,
            userId,
            ipAddress,
        );

        return savedEvent;
    }

    /**
     * Calculate SHA-256 hash of image buffer.
     * Used for integrity verification.
     */
    private calculateSHA256(buffer: Buffer): string {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    /**
     * Check if timestamp is within the allowed time window.
     */
    private isWithinTimeWindow(
        timestamp: Date,
        startTime: Date,
        endTime: Date,
    ): boolean {
        return timestamp >= startTime && timestamp <= endTime;
    }

    /**
     * Save image to storage and return URL/path.
     * In production, this would upload to S3/Azure/GCS.
     * For now, saves to local uploads directory.
     */
    private async saveImage(
        file: Express.Multer.File,
        taskId: string,
        eventType: EventType,
    ): Promise<string> {
        const uploadsDir = path.join(process.cwd(), 'uploads', taskId);

        // Ensure directory exists
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const extension = path.extname(file.originalname) || '.jpg';
        const filename = `${eventType}_${timestamp}${extension}`;
        const filepath = path.join(uploadsDir, filename);

        // Write file to disk
        fs.writeFileSync(filepath, file.buffer);

        // Return relative URL (in production, this would be a CDN URL)
        return `/uploads/${taskId}/${filename}`;
    }

    /**
     * Update task status based on event type and time window.
     * 
     * RULES:
     * - PICKUP event: Set status to IN_PROGRESS (if PENDING)
     * - FINAL event: Set status to COMPLETED (task is locked)
     * - Outside time window: Set status to SUSPICIOUS
     */
    private async updateTaskStatus(
        task: any,
        eventType: EventType,
        isWithinWindow: boolean,
        userId: string,
        ipAddress: string | null,
    ): Promise<void> {
        // If outside time window, mark as SUSPICIOUS
        if (!isWithinWindow) {
            await this.tasksService.updateStatus(
                task.id,
                TaskStatus.SUSPICIOUS,
                userId,
                ipAddress,
            );
            return;
        }

        // Handle status transitions based on event type
        switch (eventType) {
            case EventType.PICKUP:
                // Move from PENDING to IN_PROGRESS
                if (task.status === TaskStatus.PENDING) {
                    await this.tasksService.updateStatus(
                        task.id,
                        TaskStatus.IN_PROGRESS,
                        userId,
                        ipAddress,
                    );
                }
                break;

            case EventType.FINAL:
                // Lock task permanently - set to COMPLETED
                await this.tasksService.updateStatus(
                    task.id,
                    TaskStatus.COMPLETED,
                    userId,
                    ipAddress,
                );
                break;

            case EventType.TRANSIT:
                // No status change for TRANSIT events
                break;
        }
    }

    /**
     * Get all events for a task.
     * Used for viewing event history.
     */
    async findByTaskId(taskId: string): Promise<TaskEvent[]> {
        return this.taskEventRepository.find({
            where: { task_id: taskId },
            order: { server_timestamp: 'ASC' },
        });
    }

    // ════════════════════════════════════════════════════════════════════
    // SECURITY: NO UPDATE OR DELETE METHODS ARE IMPLEMENTED
    // TaskEvents are IMMUTABLE evidence records
    // ════════════════════════════════════════════════════════════════════
}
