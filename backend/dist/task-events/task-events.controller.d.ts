import { Request } from 'express';
import { TaskEventsService } from './task-events.service';
import { CreateTaskEventDto } from './dto/create-task-event.dto';
import { User } from '../users/entities/user.entity';
import { TaskEvent } from './entities/task-event.entity';
export declare class TaskEventsController {
    private readonly taskEventsService;
    constructor(taskEventsService: TaskEventsService);
    create(taskId: string, createTaskEventDto: CreateTaskEventDto, image: Express.Multer.File, currentUser: User, request: Request): Promise<TaskEvent>;
    findByTaskId(taskId: string, currentUser: User): Promise<TaskEvent[]>;
    private extractIpAddress;
}
