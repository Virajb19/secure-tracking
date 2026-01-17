import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UsersService } from '../users/users.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { TaskStatus } from '../shared/enums';
export declare class TasksService {
    private readonly taskRepository;
    private readonly usersService;
    private readonly auditLogsService;
    constructor(taskRepository: Repository<Task>, usersService: UsersService, auditLogsService: AuditLogsService);
    create(createTaskDto: CreateTaskDto, adminId: string, ipAddress: string | null): Promise<Task>;
    findAll(): Promise<Task[]>;
    findMyTasks(userId: string): Promise<Task[]>;
    findById(taskId: string): Promise<Task>;
    findByIdForUser(taskId: string, userId: string): Promise<Task>;
    updateStatus(taskId: string, status: TaskStatus, userId: string, ipAddress: string | null): Promise<Task>;
    resetForTesting(taskId: string, adminId: string, ipAddress: string | null): Promise<Task>;
}
