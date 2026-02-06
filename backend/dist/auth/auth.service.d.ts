import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    user: {
        id: string;
        name: string;
        email: string | null;
        phone: string;
        role: UserRole;
        profile_image_url?: string | null;
        is_active: boolean;
        has_completed_profile: boolean;
    };
}
export interface RefreshResponse {
    access_token: string;
    refresh_token: string;
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
    private readonly db;
    private readonly configService;
    constructor(usersService: UsersService, jwtService: JwtService, auditLogsService: AuditLogsService, db: PrismaService, configService: ConfigService);
    private hasCompletedProfile;
    private parseDuration;
    private generateRefreshToken;
    private revokeAllRefreshTokens;
    private cleanupExpiredTokens;
    login(loginDto: LoginDto, ipAddress: string | null): Promise<LoginResponse>;
    private validateDeliveryUserDevice;
    register(registerDto: RegisterDto, ipAddress: string | null): Promise<RegisterResponse>;
    adminLogin(loginDto: LoginDto, ipAddress: string | null): Promise<LoginResponse>;
    refreshAccessToken(refreshTokenRaw: string): Promise<RefreshResponse>;
    logout(userId: string, ipAddress: string | null): Promise<{
        message: string;
    }>;
}
