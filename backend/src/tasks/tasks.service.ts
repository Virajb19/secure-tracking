import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UsersService } from '../users/users.service';
import { AuditLogsService, AuditAction } from '../audit-logs/audit-logs.service';
import { TaskStatus, UserRole } from '../shared/enums';

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
        @InjectRepository(Task)
        private readonly taskRepository: Repository<Task>,
        private readonly usersService: UsersService,
        private readonly auditLogsService: AuditLogsService,
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
        const existingTask = await this.taskRepository.findOne({
            where: { sealed_pack_code: createTaskDto.sealed_pack_code },
        });

        if (existingTask) {
            throw new ConflictException(
                `Task with sealed pack code '${createTaskDto.sealed_pack_code}' already exists`,
            );
        }

        // Validate assigned user exists and is a DELIVERY user
        const assignedUser = await this.usersService.findById(createTaskDto.assigned_user_id);

        if (assignedUser.role !== UserRole.DELIVERY) {
            throw new BadRequestException('Tasks can only be assigned to DELIVERY users');
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
        const task = this.taskRepository.create({
            sealed_pack_code: createTaskDto.sealed_pack_code,
            source_location: createTaskDto.source_location,
            destination_location: createTaskDto.destination_location,
            assigned_user_id: createTaskDto.assigned_user_id,
            start_time: startTime,
            end_time: endTime,
            status: TaskStatus.PENDING,
            // created_at is auto-generated
        });

        const savedTask = await this.taskRepository.save(task);

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

        return savedTask;
    }

    /**
     * Get all tasks (Admin view).
     * Returns all tasks ordered by creation date.
     */
    async findAll(): Promise<Task[]> {
        return this.taskRepository.find({
            order: { created_at: 'DESC' },
            relations: ['assigned_user'],
        });
    }

    /**
     * Get tasks assigned to a specific DELIVERY user.
     * 
     * @param userId - ID of the DELIVERY user
     * @returns Array of tasks assigned to the user
     */
    async findMyTasks(userId: string): Promise<Task[]> {
        return this.taskRepository.find({
            where: { assigned_user_id: userId },
            order: { created_at: 'DESC' },
        });
    }

    /**
     * Get a task by ID.
     * 
     * @param taskId - Task UUID
     * @returns Task entity
     * @throws NotFoundException if task not found
     */
    async findById(taskId: string): Promise<Task> {
        const task = await this.taskRepository.findOne({
            where: { id: taskId },
            relations: ['assigned_user'],
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
    async findByIdForUser(taskId: string, userId: string): Promise<Task> {
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
        const task = await this.findById(taskId);

        const oldStatus = task.status;
        task.status = status;

        const updatedTask = await this.taskRepository.save(task);

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
        const task = await this.findById(taskId);

        // Extend time window: start from now, end in 4 hours
        const now = new Date();
        const endTime = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours

        task.start_time = now;
        task.end_time = endTime;
        task.status = TaskStatus.IN_PROGRESS;

        const updatedTask = await this.taskRepository.save(task);

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
