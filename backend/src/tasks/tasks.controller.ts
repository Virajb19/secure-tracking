import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
    ParseUUIDPipe,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { Request } from 'express';
import { User, Task, TaskEvent, UserRole } from '@prisma/client';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles, CurrentUser } from '../shared/decorators';
import { TaskEventsService } from '../task-events/task-events.service';

/**
 * Tasks Controller.
 * Provides endpoints for both ADMIN and DELIVERY users.
 * 
 * ADMIN Endpoints (from API Contract):
 * - POST /api/admin/tasks - Create a new task
 * - GET /api/admin/tasks - List all tasks
 * - GET /api/admin/tasks/:taskId - Get task details
 * - GET /api/admin/tasks/:taskId/events - Get task events
 * 
 * DELIVERY Endpoints (from API Contract):
 * - GET /api/tasks/my - Get my assigned tasks
 * - GET /api/tasks/:taskId - Get specific task details
 */

// ========================================
// ADMIN CONTROLLER
// ========================================
@Controller('admin/tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminTasksController {
    constructor(
        private readonly tasksService: TasksService,
        @Inject(forwardRef(() => TaskEventsService))
        private readonly taskEventsService: TaskEventsService,
    ) { }

    /**
     * Create a new delivery task.
     * Admin only endpoint.
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() createTaskDto: CreateTaskDto,
        @CurrentUser() currentUser: User,
        @Req() request: Request,
    ): Promise<Task> {
        const ipAddress = this.extractIpAddress(request);
        return this.tasksService.create(createTaskDto, currentUser.id, ipAddress);
    }

    /**
     * Get all tasks.
     * Admin only endpoint.
     */
    @Get()
    async findAll(): Promise<Task[]> {
        return this.tasksService.findAll();
    }

    /**
     * Get a specific task by ID.
     * Admin only endpoint.
     */
    @Get(':taskId')
    async findOne(
        @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string,
    ): Promise<Task> {
        return this.tasksService.findById(taskId);
    }

    /**
     * Get all events for a specific task.
     * Admin only endpoint - allows viewing event timeline.
     */
    @Get(':taskId/events')
    async findTaskEvents(
        @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string,
    ): Promise<TaskEvent[]> {
        return this.taskEventsService.findByTaskId(taskId);
    }

    /**
     * DEVELOPMENT ONLY: Reset task time window for testing.
     * Extends time window to 4 hours from now and resets status to IN_PROGRESS.
     * 
     * ⚠️ WARNING: This should be removed in production!
     */
    @Patch(':taskId/reset-for-testing')
    @HttpCode(HttpStatus.OK)
    async resetForTesting(
        @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string,
        @CurrentUser() currentUser: User,
        @Req() request: Request,
    ): Promise<Task> {
        const ipAddress = this.extractIpAddress(request);
        return this.tasksService.resetForTesting(taskId, currentUser.id, ipAddress);
    }

    private extractIpAddress(request: Request): string {
        const forwarded = request.headers['x-forwarded-for'];
        if (forwarded) {
            const forwardedIps = Array.isArray(forwarded) ? forwarded[0] : forwarded;
            return forwardedIps.split(',')[0].trim();
        }
        return request.ip || request.socket.remoteAddress || 'unknown';
    }
}

// ========================================
// DELIVERY CONTROLLER
// ========================================
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SEBA_OFFICER)
export class DeliveryTasksController {
    constructor(private readonly tasksService: TasksService) { }

    /**
     * Get all tasks assigned to the current DELIVERY user.
     */
    @Get('my')
    async findMyTasks(@CurrentUser() currentUser: User): Promise<Task[]> {
        return this.tasksService.findMyTasks(currentUser.id);
    }

    /**
     * Get a specific task by ID.
     * Only accessible if the task is assigned to the current user.
     */
    @Get(':taskId')
    async findOne(
        @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string,
        @CurrentUser() currentUser: User,
    ): Promise<Task> {
        return this.tasksService.findByIdForUser(taskId, currentUser.id);
    }
}
