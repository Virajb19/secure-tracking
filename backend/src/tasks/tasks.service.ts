import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { Task, TaskStatus, UserRole, ExamType } from '@prisma/client';
import { PrismaService } from '../prisma';
import { CreateTaskDto } from './dto/create-task.dto';
import { UsersService } from '../users/users.service';
import { AuditLogsService, AuditAction } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

// Re-export TaskStatus for use in other modules
export { TaskStatus } from '@prisma/client';

// Type alias for Task with assigned_user relation
type TaskWithUser = Task & { assigned_user?: { id: string; name: string; phone: string; role: UserRole } };

/**
 * Tasks Service.
 * Handles all task-related business logic.
 * 
 * SECURITY:
 * - Only ADMIN can create tasks
 * - Only assigned DELIVERY user can view their tasks
 * - Task status transitions are validated
 * - All modifications are logged to audit_logs
 */
@Injectable()
export class TasksService {
    constructor(
        private readonly db: PrismaService,
        private readonly usersService: UsersService,
        private readonly auditLogsService: AuditLogsService,
        private readonly notificationsService: NotificationsService,
    ) { }

    /**
     * Create a new delivery task.
     * Only callable by ADMIN users.
     * 
     * @param createTaskDto - Task creation data
     * @param adminId - ID of the admin creating the task
     * @param ipAddress - Client IP address
     * @returns Created task
     */
    async create(
        createTaskDto: CreateTaskDto,
        adminId: string,
        ipAddress: string | null,
    ): Promise<Task> {
        // Validate sealed_pack_code is unique
        const existingTask = await this.db.task.findUnique({
            where: { sealed_pack_code: createTaskDto.sealed_pack_code },
        });

        if (existingTask) {
            throw new ConflictException(
                `Task with sealed pack code '${createTaskDto.sealed_pack_code}' already exists`,
            );
        }

        // Validate assigned user exists and is a DELIVERY user
        const assignedUser = await this.usersService.findById(createTaskDto.assigned_user_id);

        if (assignedUser.role !== UserRole.SEBA_OFFICER) {
            throw new BadRequestException('Tasks can only be assigned to SEBA_OFFICER users');
        }

        if (!assignedUser.is_active) {
            throw new BadRequestException('Cannot assign task to an inactive user');
        }

        // Validate time window
        const startTime = new Date(createTaskDto.start_time);
        const endTime = new Date(createTaskDto.end_time);

        if (endTime <= startTime) {
            throw new BadRequestException('End time must be after start time');
        }

        // Create task with default status PENDING
        const savedTask = await this.db.task.create({
            data: {
                sealed_pack_code: createTaskDto.sealed_pack_code,
                source_location: createTaskDto.source_location,
                destination_location: createTaskDto.destination_location,
                assigned_user_id: createTaskDto.assigned_user_id,
                start_time: startTime,
                end_time: endTime,
                exam_type: (createTaskDto.exam_type as ExamType) || ExamType.REGULAR,
                status: TaskStatus.PENDING,
                // Geo-fence coordinates (optional)
                pickup_latitude: createTaskDto.pickup_latitude,
                pickup_longitude: createTaskDto.pickup_longitude,
                destination_latitude: createTaskDto.destination_latitude,
                destination_longitude: createTaskDto.destination_longitude,
                geofence_radius: createTaskDto.geofence_radius ?? 100,
                // created_at is auto-generated
            },
        });

        // Log task creation to audit trail
        await this.auditLogsService.log(
            AuditAction.TASK_CREATED,
            'Task',
            savedTask.id,
            adminId,
            ipAddress,
        );

        // Log task assignment
        await this.auditLogsService.log(
            AuditAction.TASK_ASSIGNED,
            'Task',
            savedTask.id,
            adminId,
            ipAddress,
        );

        // Send notification to assigned user
        await this.notificationsService.notifyTaskAssigned(
            createTaskDto.assigned_user_id,
            createTaskDto.sealed_pack_code,
        );

        return savedTask;
    }

    /**
     * Get all tasks (Admin view) with pagination.
     * Returns paginated tasks ordered by creation date.
     * Optionally filter by exam type and status.
     */
    async findAll(
        examType?: ExamType,
        status?: TaskStatus,
        page: number = 1,
        limit: number = 20,
    ): Promise<{ data: TaskWithUser[]; total: number; page: number; limit: number; totalPages: number }> {
        const skip = (page - 1) * limit;

        const where: any = {};
        if (examType) where.exam_type = examType;
        if (status) where.status = status;

        const [data, total] = await Promise.all([
            this.db.task.findMany({
                where: Object.keys(where).length > 0 ? where : undefined,
                orderBy: { created_at: 'desc' },
                include: { assigned_user: true },
                skip,
                take: limit,
            }),
            this.db.task.count({
                where: Object.keys(where).length > 0 ? where : undefined,
            }),
        ]);

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Get all tasks with their events for overview display.
     * Useful for Question Paper Tracking overview.
     * 
     * @param examType - Optional filter by exam type
     * @param date - Optional filter by date (tasks created on this date)
     */
    async findAllWithEvents(examType?: ExamType, date?: Date): Promise<(TaskWithUser & { events: any[] })[]> {
        const whereClause: any = {};

        if (examType) {
            whereClause.exam_type = examType;
        }

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            whereClause.start_time = {
                gte: startOfDay,
                lte: endOfDay,
            };
        }

        return this.db.task.findMany({
            where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
            orderBy: { created_at: 'desc' },
            include: {
                assigned_user: true,
                events: {
                    orderBy: { created_at: 'asc' }
                }
            },
        });
    }

    /**
     * Get tasks assigned to a specific DELIVERY user.
     * 
     * @param userId - ID of the DELIVERY user
     * @returns Array of tasks assigned to the user
     */
    async findMyTasks(userId: string): Promise<Task[]> {
        return this.db.task.findMany({
            where: { assigned_user_id: userId },
            orderBy: { created_at: 'desc' },
        });
    }

    /**
     * Get a task by ID.
     * 
     * @param taskId - Task UUID
     * @returns Task entity
     * @throws NotFoundException if task not found
     */
    async findById(taskId: string): Promise<TaskWithUser> {
        const task = await this.db.task.findUnique({
            where: { id: taskId },
            include: { assigned_user: true },
        });

        if (!task) {
            throw new NotFoundException(`Task with ID '${taskId}' not found`);
        }

        return task;
    }

    /**
     * Get a task by ID for a specific DELIVERY user.
     * Ensures the user can only access their assigned tasks.
     * 
     * @param taskId - Task UUID
     * @param userId - ID of the requesting DELIVERY user
     * @returns Task entity
     * @throws ForbiddenException if task not assigned to user
     */
    async findByIdForUser(taskId: string, userId: string): Promise<TaskWithUser> {
        const task = await this.findById(taskId);

        if (task.assigned_user_id !== userId) {
            throw new ForbiddenException('You are not assigned to this task');
        }

        return task;
    }

    /**
     * Update task status.
     * Used internally by task-events module.
     * 
     * @param taskId - Task UUID
     * @param status - New status
     * @param userId - User making the change
     * @param ipAddress - Client IP address
     */
    async updateStatus(
        taskId: string,
        status: TaskStatus,
        userId: string,
        ipAddress: string | null,
    ): Promise<Task> {
        const updatedTask = await this.db.task.update({
            where: { id: taskId },
            data: { status },
        });

        // Log status change
        await this.auditLogsService.log(
            status === TaskStatus.SUSPICIOUS
                ? AuditAction.TASK_MARKED_SUSPICIOUS
                : status === TaskStatus.COMPLETED
                    ? AuditAction.TASK_COMPLETED
                    : AuditAction.TASK_STATUS_CHANGED,
            'Task',
            taskId,
            userId,
            ipAddress,
        );

        return updatedTask;
    }

    /**
     * DEVELOPMENT ONLY: Reset task for testing.
     * Extends time window to 4 hours from now and resets status.
     * 
     * ⚠️ WARNING: This should be removed in production!
     * 
     * @param taskId - Task UUID
     * @param adminId - Admin making the change
     * @param ipAddress - Client IP address
     */
    async resetForTesting(
        taskId: string,
        adminId: string,
        ipAddress: string | null,
    ): Promise<Task> {
        // Extend time window: start from now, end in 4 hours
        const now = new Date();
        const endTime = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours

        const updatedTask = await this.db.task.update({
            where: { id: taskId },
            data: {
                start_time: now,
                end_time: endTime,
                status: TaskStatus.IN_PROGRESS,
            },
        });

        // Log the reset action
        await this.auditLogsService.log(
            AuditAction.TASK_STATUS_CHANGED,
            'Task',
            taskId,
            adminId,
            ipAddress,
        );

        return updatedTask;
    }
}
