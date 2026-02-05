import { Request } from 'express';
import { User, Task, TaskEvent } from '@prisma/client';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskEventsService } from '../task-events/task-events.service';
export declare class AdminTasksController {
    private readonly tasksService;
    private readonly taskEventsService;
    constructor(tasksService: TasksService, taskEventsService: TaskEventsService);
    create(createTaskDto: CreateTaskDto, currentUser: User, request: Request): Promise<Task>;
    findAll(examType?: string, status?: string, page?: string, limit?: string): Promise<{
        data: Task[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findAllWithEvents(examType?: string, dateStr?: string): Promise<(Task & {
        events: TaskEvent[];
    })[]>;
    findOne(taskId: string): Promise<Task>;
    findTaskEvents(taskId: string): Promise<TaskEvent[]>;
    resetForTesting(taskId: string, currentUser: User, request: Request): Promise<Task>;
    private extractIpAddress;
}
export declare class DeliveryTasksController {
    private readonly tasksService;
    constructor(tasksService: TasksService);
    findMyTasks(currentUser: User): Promise<Task[]>;
    findOne(taskId: string, currentUser: User): Promise<Task>;
}
