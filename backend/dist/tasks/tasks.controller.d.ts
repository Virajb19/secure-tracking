import { Request } from 'express';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { User } from '../users/entities/user.entity';
import { Task } from './entities/task.entity';
import { TaskEventsService } from '../task-events/task-events.service';
import { TaskEvent } from '../task-events/entities/task-event.entity';
export declare class AdminTasksController {
    private readonly tasksService;
    private readonly taskEventsService;
    constructor(tasksService: TasksService, taskEventsService: TaskEventsService);
    create(createTaskDto: CreateTaskDto, currentUser: User, request: Request): Promise<Task>;
    findAll(): Promise<Task[]>;
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
