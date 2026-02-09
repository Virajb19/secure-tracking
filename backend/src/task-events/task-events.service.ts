import {
    Injectable,
    BadRequestException,
    ForbiddenException,
    ConflictException,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { TaskEvent, TaskStatus, EventType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma';
import { CreateTaskEventDto } from './dto/create-task-event.dto';
import { TasksService } from '../tasks/tasks.service';
import { AuditLogsService, AuditAction } from '../audit-logs/audit-logs.service';
import { AppwriteService } from '../appwrite/appwrite.service';

// Re-export EventType for use in other modules
export { EventType } from '@prisma/client';

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
        private readonly db: PrismaService,
        @Inject(forwardRef(() => TasksService))
        private readonly tasksService: TasksService,
        private readonly auditLogsService: AuditLogsService,
        private readonly appwriteService: AppwriteService,
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
        const existingEvent = await this.db.taskEvent.findUnique({
            where: {
                task_id_event_type: {
                    task_id: taskId,
                    event_type: createDto.event_type as EventType,
                },
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
        const imageUrl = await this.saveImage(imageFile, taskId, createDto.event_type as EventType);

        // ================================================================
        // STEP 9: Create event record (IMMUTABLE - no update method exists)
        // ================================================================
        const savedEvent = await this.db.taskEvent.create({
            data: {
                task_id: taskId,
                event_type: createDto.event_type as EventType,
                image_url: imageUrl,
                image_hash: imageHash,
                latitude: new Decimal(createDto.latitude),
                longitude: new Decimal(createDto.longitude),
                server_timestamp: serverTimestamp,
                // created_at is auto-generated
            },
        });

        // ================================================================
        // STEP 10: Update task status based on event type and time window
        // ================================================================
        await this.updateTaskStatus(
            task,
            createDto.event_type as EventType,
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
     * Save image to Appwrite storage and return URL.
     * Uses Appwrite for cloud storage to ensure reliable access.
     */
    private async saveImage(
        file: Express.Multer.File,
        taskId: string,
        eventType: EventType,
    ): Promise<string> {
        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const extension = file.originalname?.split('.').pop() || 'jpg';
        const filename = `task-events/${taskId}/${eventType}_${timestamp}.${extension}`;

        // Upload to Appwrite
        const appwriteUrl = await this.appwriteService.uploadFile(
            file.buffer,
            filename,
            file.mimetype || 'image/jpeg',
        );

        if (!appwriteUrl) {
            throw new BadRequestException('Failed to upload image. Please try again.');
        }

        return appwriteUrl;
    }

    /**
     * Update task status based on event type and time window.
     * 
     * RULES (5-STEP TRACKING):
     * - PICKUP_POLICE_STATION: Set status to IN_PROGRESS
     * - SUBMISSION_POST_OFFICE: Set status to COMPLETED (task is locked)
     * - Outside time window: Set status to SUSPICIOUS
     * - Red Flag: Detect drastic travel time changes
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

        // Check for red flag (drastic travel time change)
        await this.checkRedFlag(task, eventType, userId, ipAddress);

        // Handle status transitions based on event type
        switch (eventType) {
            case EventType.PICKUP_POLICE_STATION:
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

            case EventType.SUBMISSION_POST_OFFICE:
                // Lock task permanently - set to COMPLETED
                await this.tasksService.updateStatus(
                    task.id,
                    TaskStatus.COMPLETED,
                    userId,
                    ipAddress,
                );
                break;

            // Other events don't change status
            case EventType.ARRIVAL_EXAM_CENTER:
            case EventType.OPENING_SEAL:
            case EventType.SEALING_ANSWER_SHEETS:
                break;
        }
    }

    /**
     * RED FLAG DETECTION
     * Detects drastic changes in travel time compared to expected.
     * If travel time exceeds expected by 50%, mark as suspicious.
     */
    private async checkRedFlag(
        task: any,
        eventType: EventType,
        userId: string,
        ipAddress: string | null,
    ): Promise<void> {
        // Only check for ARRIVAL_EXAM_CENTER (travel time from pickup to center)
        if (eventType !== EventType.ARRIVAL_EXAM_CENTER) {
            return;
        }

        // Get pickup event
        const pickupEvent = await this.db.taskEvent.findFirst({
            where: {
                task_id: task.id,
                event_type: EventType.PICKUP_POLICE_STATION,
            },
        });

        if (!pickupEvent) return;

        // Calculate actual travel time in minutes
        const now = new Date();
        const travelTimeMinutes = Math.round(
            (now.getTime() - pickupEvent.server_timestamp.getTime()) / (1000 * 60)
        );

        // Compare with expected travel time
        const expectedTime = task.expected_travel_time || 30; // Default 30 minutes
        const threshold = expectedTime * 1.5; // 50% tolerance

        if (travelTimeMinutes > threshold) {
            // Mark as suspicious due to red flag
            await this.tasksService.updateStatus(
                task.id,
                TaskStatus.SUSPICIOUS,
                userId,
                ipAddress,
            );

            await this.auditLogsService.log(
                'RED_FLAG_TRAVEL_TIME',
                'Task',
                task.id,
                userId,
                ipAddress,
            );
        }
    }

    /**
     * Get allowed event types for a task based on double shift logic
     */
    async getAllowedEventTypes(taskId: string): Promise<EventType[]> {
        const task = await this.tasksService.findById(taskId);

        // Get already recorded events
        const recordedEvents = await this.db.taskEvent.findMany({
            where: { task_id: taskId },
            select: { event_type: true },
        });
        const recordedTypes = new Set(recordedEvents.map(e => e.event_type));

        // All 5 steps
        const allSteps: EventType[] = [
            EventType.PICKUP_POLICE_STATION,
            EventType.ARRIVAL_EXAM_CENTER,
            EventType.OPENING_SEAL,
            EventType.SEALING_ANSWER_SHEETS,
            EventType.SUBMISSION_POST_OFFICE,
        ];

        // Double shift logic: Afternoon shift skips first 2 steps
        let allowedSteps = allSteps;
        if (task.is_double_shift && task.shift_type === 'AFTERNOON') {
            allowedSteps = [
                EventType.OPENING_SEAL,
                EventType.SEALING_ANSWER_SHEETS,
                EventType.SUBMISSION_POST_OFFICE,
            ];
        }

        // Filter out already recorded events
        return allowedSteps.filter(step => !recordedTypes.has(step));
    }

    /**
     * Get all events for a task.
     * Used for viewing event history.
     */
    async findByTaskId(taskId: string): Promise<TaskEvent[]> {
        return this.db.taskEvent.findMany({
            where: { task_id: taskId },
            orderBy: { server_timestamp: 'asc' },
        });
    }

    // ════════════════════════════════════════════════════════════════════
    // SECURITY: NO UPDATE OR DELETE METHODS ARE IMPLEMENTED
    // TaskEvents are IMMUTABLE evidence records
    // ════════════════════════════════════════════════════════════════════
}
