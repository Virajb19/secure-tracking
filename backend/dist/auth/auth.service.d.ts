import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '../shared/enums';
export interface LoginResponse {
    access_token: string;
    user: {
        id: string;
        name: string;
        phone: string;
        role: UserRole;
    };
}
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly auditLogsService;
    constructor(usersService: UsersService, jwtService: JwtService, auditLogsService: AuditLogsService);
    login(loginDto: LoginDto, ipAddress: string | null): Promise<LoginResponse>;
    private validateDeliveryUserDevice;
}
