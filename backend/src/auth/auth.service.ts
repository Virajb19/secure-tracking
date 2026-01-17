import {
    Injectable,
    UnauthorizedException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { AuditLogsService, AuditAction } from '../audit-logs/audit-logs.service';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../shared/enums';

/**
 * Login response structure.
 */
export interface LoginResponse {
    access_token: string;
    user: {
        id: string;
        name: string;
        phone: string;
        role: UserRole;
    };
}

/**
 * Authentication Service.
 * Handles user login with JWT token generation.
 * 
 * CRITICAL SECURITY RULES:
 * 1. DELIVERY users MUST provide device_id
 * 2. First login binds device_id permanently
 * 3. Subsequent logins MUST match bound device_id
 * 4. ADMIN users do not require device_id
 * 5. All login attempts (success/failure) are logged
 */
@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly auditLogsService: AuditLogsService,
    ) { }

    /**
     * Authenticate user and return JWT token.
     * 
     * @param loginDto - Login credentials
     * @param ipAddress - Client IP address for audit logging
     * @returns JWT token and user info
     * @throws UnauthorizedException if credentials invalid
     * @throws ForbiddenException if device_id mismatch
     */
    async login(loginDto: LoginDto, ipAddress: string | null): Promise<LoginResponse> {
        // Find user by phone
        const user = await this.usersService.findByPhone(loginDto.phone);

        if (!user) {
            // Log failed login attempt
            await this.auditLogsService.log(
                AuditAction.USER_LOGIN_FAILED,
                'User',
                null,
                null,
                ipAddress,
            );
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if user is active
        if (!user.is_active) {
            await this.auditLogsService.log(
                AuditAction.USER_LOGIN_FAILED,
                'User',
                user.id,
                user.id,
                ipAddress,
            );
            throw new UnauthorizedException('Account is deactivated');
        }

        // DELIVERY users must provide device_id
        if (user.role === UserRole.DELIVERY) {
            await this.validateDeliveryUserDevice(user, loginDto.device_id, ipAddress);
        }

        // Generate JWT token
        const payload = {
            sub: user.id,
            phone: user.phone,
            role: user.role,
        };

        const accessToken = this.jwtService.sign(payload);

        // Log successful login
        await this.auditLogsService.log(
            AuditAction.USER_LOGIN,
            'User',
            user.id,
            user.id,
            ipAddress,
        );

        return {
            access_token: accessToken,
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                role: user.role,
            },
        };
    }

    /**
     * Validate device_id for DELIVERY users.
     * 
     * SECURITY RULES:
     * - DELIVERY users MUST provide device_id
     * - First login binds device_id permanently
     * - Subsequent logins MUST match bound device_id
     * 
     * @param user - The DELIVERY user
     * @param deviceId - Device ID from login request
     * @param ipAddress - Client IP for audit logging
     */
    private async validateDeliveryUserDevice(
        user: User,
        deviceId: string | undefined,
        ipAddress: string | null,
    ): Promise<void> {
        // DELIVERY users MUST provide device_id
        if (!deviceId) {
            throw new BadRequestException('device_id is required for DELIVERY users');
        }

        // First login - bind device_id
        if (!user.device_id) {
            await this.usersService.bindDeviceId(user.id, deviceId, ipAddress);
            return;
        }

        // Subsequent logins - verify device_id matches
        if (user.device_id !== deviceId) {
            // Log security violation
            await this.auditLogsService.log(
                AuditAction.DEVICE_ID_MISMATCH,
                'User',
                user.id,
                user.id,
                ipAddress,
            );

            throw new ForbiddenException(
                'Device ID mismatch. This account is bound to a different device.',
            );
        }
    }
}
