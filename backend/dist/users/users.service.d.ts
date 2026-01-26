import { User, UserRole, Gender } from '@prisma/client';
import { PrismaService } from '../prisma';
import { CreateUserDto } from './dto/create-user.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
export interface RegisterUserData {
    name: string;
    email: string;
    password: string;
    phone: string;
    role: UserRole;
    gender: Gender;
    profile_image_url?: string;
    is_active: boolean;
}
export declare class UsersService {
    private readonly db;
    private readonly auditLogsService;
    private readonly notificationsService;
    constructor(db: PrismaService, auditLogsService: AuditLogsService, notificationsService: NotificationsService);
    create(createUserDto: CreateUserDto, creatorId: string, ipAddress: string | null): Promise<User>;
    findAll(): Promise<User[]>;
    findById(id: string): Promise<User>;
    findByPhone(phone: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    registerUser(data: RegisterUserData, ipAddress: string | null): Promise<User>;
    bindDeviceId(userId: string, deviceId: string, ipAddress: string | null): Promise<User>;
    deactivate(userId: string, adminId: string, ipAddress: string | null): Promise<User>;
    toggleActiveStatus(userId: string, isActive: boolean, adminId: string, ipAddress: string | null): Promise<User>;
    updatePersonalDetails(userId: string, data: {
        name?: string;
        phone?: string;
        gender?: Gender;
    }, ipAddress: string | null): Promise<User>;
}
