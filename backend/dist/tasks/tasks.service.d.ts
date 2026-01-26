import { Task, TaskStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma';
import { CreateTaskDto } from './dto/create-task.dto';
import { UsersService } from '../users/users.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
export { TaskStatus } from '@prisma/client';
type TaskWithUser = Task & {
    assigned_user?: {
        id: string;
        name: string;
        phone: string;
        role: UserRole;
    };
};
export declare class TasksService {
    private readonly db;
    private readonly usersService;
    private readonly auditLogsService;
    private readonly notificationsService;
    constructor(db: PrismaService, usersService: UsersService, auditLogsService: AuditLogsService, notificationsService: NotificationsService);
    create(createTaskDto: CreateTaskDto, adminId: string, ipAddress: string | null): Promise<Task>;
    findAll(): Promise<TaskWithUser[]>;
    findMyTasks(userId: string): Promise<Task[]>;
    findById(taskId: string): Promise<TaskWithUser>;
    findByIdForUser(taskId: string, userId: string): Promise<TaskWithUser>;
    updateStatus(taskId: string, status: TaskStatus, userId: string, ipAddress: string | null): Promise<Task>;
    resetForTesting(taskId: string, adminId: string, ipAddress: string | null): Promise<Task>;
}
