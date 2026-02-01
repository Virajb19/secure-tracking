import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export interface LoginResponse {
    access_token: string;
    user: {
        id: string;
        name: string;
        email: string | null;
        phone: string;
        role: UserRole;
        profile_image_url?: string | null;
    };
}
export interface RegisterResponse {
    message: string;
    user: {
        id: string;
        name: string;
        email: string | null;
        phone: string;
        role: UserRole;
        profile_image_url?: string | null;
    };
}
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly auditLogsService;
    constructor(usersService: UsersService, jwtService: JwtService, auditLogsService: AuditLogsService);
    login(loginDto: LoginDto, ipAddress: string | null): Promise<LoginResponse>;
    private validateDeliveryUserDevice;
    register(registerDto: RegisterDto, ipAddress: string | null): Promise<RegisterResponse>;
    adminLogin(loginDto: LoginDto, ipAddress: string | null): Promise<LoginResponse>;
    logout(userId: string, ipAddress: string | null): Promise<{
        message: string;
    }>;
}
