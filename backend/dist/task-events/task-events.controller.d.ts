import { Request } from 'express';
import { User, TaskEvent } from '@prisma/client';
import { TaskEventsService } from './task-events.service';
import { CreateTaskEventDto } from './dto/create-task-event.dto';
export declare class TaskEventsController {
    private readonly taskEventsService;
    constructor(taskEventsService: TaskEventsService);
    create(taskId: string, createTaskEventDto: CreateTaskEventDto, image: Express.Multer.File, currentUser: User, request: Request): Promise<TaskEvent>;
    findByTaskId(taskId: string, currentUser: User): Promise<TaskEvent[]>;
    getAllowedEventTypes(taskId: string, currentUser: User): Promise<{
        allowedTypes: string[];
    }>;
    private extractIpAddress;
}
