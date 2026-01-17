import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
export declare class UsersService {
    private readonly userRepository;
    private readonly auditLogsService;
    constructor(userRepository: Repository<User>, auditLogsService: AuditLogsService);
    create(createUserDto: CreateUserDto, creatorId: string, ipAddress: string | null): Promise<User>;
    findAll(): Promise<User[]>;
    findById(id: string): Promise<User>;
    findByPhone(phone: string): Promise<User | null>;
    bindDeviceId(userId: string, deviceId: string, ipAddress: string | null): Promise<User>;
    deactivate(userId: string, adminId: string, ipAddress: string | null): Promise<User>;
}
