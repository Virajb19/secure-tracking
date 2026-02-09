import { TaskEvent, EventType } from '@prisma/client';
import { PrismaService } from '../prisma';
import { CreateTaskEventDto } from './dto/create-task-event.dto';
import { TasksService } from '../tasks/tasks.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AppwriteService } from '../appwrite/appwrite.service';
export { EventType } from '@prisma/client';
export declare class TaskEventsService {
    private readonly db;
    private readonly tasksService;
    private readonly auditLogsService;
    private readonly appwriteService;
    constructor(db: PrismaService, tasksService: TasksService, auditLogsService: AuditLogsService, appwriteService: AppwriteService);
    create(taskId: string, createDto: CreateTaskEventDto, imageFile: Express.Multer.File, userId: string, ipAddress: string | null): Promise<TaskEvent>;
    private calculateSHA256;
    private isWithinTimeWindow;
    private saveImage;
    private updateTaskStatus;
    private checkRedFlag;
    getAllowedEventTypes(taskId: string): Promise<EventType[]>;
    findByTaskId(taskId: string): Promise<TaskEvent[]>;
}
