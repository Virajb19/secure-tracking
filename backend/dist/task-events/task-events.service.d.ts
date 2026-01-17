import { Repository } from 'typeorm';
import { TaskEvent } from './entities/task-event.entity';
import { CreateTaskEventDto } from './dto/create-task-event.dto';
import { TasksService } from '../tasks/tasks.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
export declare class TaskEventsService {
    private readonly taskEventRepository;
    private readonly tasksService;
    private readonly auditLogsService;
    constructor(taskEventRepository: Repository<TaskEvent>, tasksService: TasksService, auditLogsService: AuditLogsService);
    create(taskId: string, createDto: CreateTaskEventDto, imageFile: Express.Multer.File, userId: string, ipAddress: string | null): Promise<TaskEvent>;
    private calculateSHA256;
    private isWithinTimeWindow;
    private saveImage;
    private updateTaskStatus;
    findByTaskId(taskId: string): Promise<TaskEvent[]>;
}
