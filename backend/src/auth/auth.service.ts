import {
    Injectable,
    UnauthorizedException,
    ForbiddenException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, UserRole, Gender } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { AuditLogsService, AuditAction } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { env } from '@/env.validation';

/**
 * Login response structure.
 */
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

/**
 * Refresh response structure.
 */
export interface RefreshResponse {
    access_token: string;
    refresh_token: string;
}

/**
 * Register response structure.
 */
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
        private readonly db: PrismaService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Check if a non-admin user has completed their Faculty profile.
     * Admins are considered to have completed profile by default.
     */
    private async hasCompletedProfile(userId: string, role: UserRole): Promise<boolean> {
        // Admins don't need to complete a faculty profile
        if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) {
            return true;
        }

        // Check if Faculty record exists for this user
        const faculty = await this.db.faculty.findUnique({
            where: { user_id: userId },
        });

        return faculty !== null;
    }

    /**
     * Parse a duration string (e.g., "7d", "15m", "24h") into milliseconds.
     */
    private parseDuration(duration: string): number {
        const match = duration.match(/^(\d+)(s|m|h|d)$/);
        if (!match) throw new Error(`Invalid duration: ${duration}`);
        const value = parseInt(match[1]);
        const unit = match[2];
        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: throw new Error(`Unknown unit: ${unit}`);
        }
    }

    /**
     * Generate a cryptographically secure refresh token, hash it, and store in DB.
     * @returns The raw refresh token (to send to client)
     */
    private async generateRefreshToken(userId: string): Promise<string> {
        const rawToken = crypto.randomBytes(64).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        const expiresIn = this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN', '7d');
        const expiresAt = new Date(Date.now() + this.parseDuration(expiresIn));

        await this.db.refreshToken.create({
            data: {
                token_hash: tokenHash,
                user_id: userId,
                expires_at: expiresAt,
            },
        });

        return rawToken;
    }

    /**
     * Revoke all refresh tokens for a user (e.g., on logout or password change).
     */
    private async revokeAllRefreshTokens(userId: string): Promise<void> {
        await this.db.refreshToken.deleteMany({
            where: { user_id: userId },
        });
    }

    /**
     * Clean up expired refresh tokens for a user.
     */
    private async cleanupExpiredTokens(userId: string): Promise<void> {
        await this.db.refreshToken.deleteMany({
            where: {
                user_id: userId,
                expires_at: { lt: new Date() },
            },
        });
    }

    /**
     * Authenticate user and return JWT token.
     * Supports two login methods:
     * 1. Email + Password (for Admin CMS)
     * 2. Email + Password + Phone + Device ID (for Mobile App)
     * 
     * @param loginDto - Login credentials
     * @param ipAddress - Client IP address for audit logging
     * @returns JWT token and user info
     * @throws UnauthorizedException if credentials invalid
     * @throws ForbiddenException if device_id mismatch
     */
    async login(loginDto: LoginDto, ipAddress: string | null): Promise<LoginResponse> {
        let user: User | null = null;

        // Determine login method
        if (loginDto.email && loginDto.password) {
            // Email + Password login
            console.log('Login attempt for email:', loginDto.email);
            user = await this.usersService.findByEmail(loginDto.email);

            if (!user) {
                await this.auditLogsService.log(
                    AuditAction.USER_LOGIN_FAILED,
                    'User',
                    null,
                    null,
                    ipAddress,
                );
                throw new UnauthorizedException('Invalid credentials');
            }

            const isPasswordValid = env.NODE_ENV === 'development'
                ? (loginDto.password === user.password) // TEMPORARY: Plaintext check in development
                : await bcrypt.compare(loginDto.password, user.password);

            if (!isPasswordValid) {
                await this.auditLogsService.log(
                    AuditAction.USER_LOGIN_FAILED,
                    'User',
                    user.id,
                    user.id,
                    ipAddress,
                );
                throw new UnauthorizedException('Invalid credentials');
            }

            // For Mobile App: verify phone also matches if provided (non-empty)
            // Skip phone validation for Admin CMS (ADMIN/SUPER_ADMIN roles)
            if (loginDto.phone && loginDto.phone.trim() !== '' && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
                const normalizedInputPhone = loginDto.phone.replace(/[\s-]/g, '');
                const normalizedUserPhone = user.phone.replace(/[\s-]/g, '');

                if (normalizedInputPhone !== normalizedUserPhone) {
                    await this.auditLogsService.log(
                        AuditAction.USER_LOGIN_FAILED,
                        'User',
                        user.id,
                        user.id,
                        ipAddress,
                    );
                    throw new UnauthorizedException('Phone number does not match the registered account');
                }
            }
        } else if (loginDto.phone) {
            // Phone-only login (legacy - should not be used for mobile)
            console.log('Login attempt for phone:', loginDto.phone);
            user = await this.usersService.findByPhone(loginDto.phone);

            if (!user) {
                await this.auditLogsService.log(
                    AuditAction.USER_LOGIN_FAILED,
                    'User',
                    null,
                    null,
                    ipAddress,
                );
                throw new UnauthorizedException('Invalid credentials');
            }
        } else {
            throw new BadRequestException('Either email+password or phone is required');
        }

        // Note: Inactive users CAN login now, but with limited access
        // The mobile app will show a pending approval screen for inactive users

        // DELIVERY users must provide device_id
        if (user.role === UserRole.SEBA_OFFICER) {
            await this.validateDeliveryUserDevice(user, loginDto.device_id, ipAddress);
        }

        // Generate JWT token
        const payload = {
            sub: user.id,
            phone: user.phone,
            role: user.role,
        };

        const accessToken = this.jwtService.sign(payload);

        // Generate refresh token
        const refreshToken = await this.generateRefreshToken(user.id);

        // Clean up expired tokens in the background
        this.cleanupExpiredTokens(user.id).catch(() => {});

        // Log successful login
        await this.auditLogsService.log(
            AuditAction.USER_LOGIN,
            'User',
            user.id,
            user.id,
            ipAddress,
        );

        // Check if user has completed their profile
        const hasProfile = await this.hasCompletedProfile(user.id, user.role);

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                is_active: user.is_active,
                has_completed_profile: hasProfile,
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
     * - IN DEVELOPMENT MODE: Device binding is disabled for easier testing
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
        // DEVELOPMENT MODE: Skip device binding validation
        if (env.NODE_ENV === 'development') {
            console.log('[DEV] Device binding skipped for development mode');
            return;
        }

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

    /**
     * Register a new user.
     * 
     * SECURITY RULES:
     * - Only non-admin roles can register (SEBA_OFFICER, HEADMASTER, TEACHER, CENTER_SUPERINTENDENT)
     * - ADMIN and SUPER_ADMIN users are created by existing admins only
     * - Account is created as inactive by default (requires admin approval)
     * 
     * @param registerDto - Registration data
     * @param ipAddress - Client IP for audit logging
     * @returns Registration confirmation
     */
    async register(registerDto: RegisterDto, ipAddress: string | null): Promise<RegisterResponse> {
        // Check if email already exists
        const existingEmail = await this.usersService.findByEmail(registerDto.email);
        if (existingEmail) {
            throw new ConflictException('Email already registered');
        }

        // Check if phone already exists
        const existingPhone = await this.usersService.findByPhone(registerDto.phone);
        if (existingPhone) {
            throw new ConflictException('Phone number already registered');
        }

        // Hash password
        const hashedPassword = env.NODE_ENV === 'development' ? registerDto.password : await bcrypt.hash(registerDto.password, 10);

        // Create user with inactive status (requires admin approval)
        const user = await this.usersService.registerUser({
            name: registerDto.name,
            email: registerDto.email,
            password: hashedPassword,
            phone: registerDto.phone,
            role: registerDto.role as UserRole,
            gender: registerDto.gender as Gender,
            profile_image_url: registerDto.profile_image_url,
            is_active: false, // Requires admin approval
        }, ipAddress);

        // Log registration
        await this.auditLogsService.log(
            AuditAction.USER_REGISTERED,
            'User',
            user.id,
            user.id,
            ipAddress,
        );

        console.log('New user registered with ID:', user.id);

        return {
            message: 'Registration successful. Please wait for admin approval.',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
            },
        };
    }

    /**
     * Admin-only login for CMS.
     * Only ADMIN and SUPER_ADMIN users can login through this endpoint.
     * 
     * @param loginDto - Login credentials (email + password)
     * @param ipAddress - Client IP for audit logging
     * @returns JWT token and user info
     * @throws UnauthorizedException if credentials invalid or user is not admin
     */
    async adminLogin(loginDto: LoginDto, ipAddress: string | null): Promise<LoginResponse> {
        if (!loginDto.email || !loginDto.password) {
            throw new BadRequestException('Email and password are required');
        }

        // check if user exists with given email
        const user = await this.usersService.findByEmail(loginDto.email);

        if (!user) {
            await this.auditLogsService.log(
                AuditAction.USER_LOGIN_FAILED,
                'User',
                null,
                null,
                ipAddress,
            );
            throw new UnauthorizedException('Login failed. Please check your credentials.');
        }

        // ONLY allow ADMIN and SUPER_ADMIN to login via CMS
        if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
            await this.auditLogsService.log(
                AuditAction.USER_LOGIN_FAILED,
                'User',
                user.id,
                user.id,
                ipAddress,
            );
            throw new ForbiddenException('Access denied. Only administrators can access this portal.');
        }

        // Verify password
        const isPasswordValid = env.NODE_ENV === 'development'
            ? (loginDto.password === user.password) // TEMPORARY: Plaintext check in development
            : await bcrypt.compare(loginDto.password, user.password);

        if (!isPasswordValid) {
            await this.auditLogsService.log(
                AuditAction.USER_LOGIN_FAILED,
                'User',
                user.id,
                user.id,
                ipAddress,
            );
            throw new UnauthorizedException('Login failed. Please check your credentials.');
        }

        // check if phone matches
        const userWithPhone = await this.usersService.findByPhone(loginDto.phone);
        if(!userWithPhone || userWithPhone.id !== user.id) {
            await this.auditLogsService.log(
                AuditAction.USER_LOGIN_FAILED,
                'User',
                user.id,
                user.id,
                ipAddress,
            );
            throw new UnauthorizedException('Incorrect phone number for the given email');
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
            throw new UnauthorizedException('Your account is inactive. Please contact the system administrator.');
        }

        // Generate JWT token
        const payload = {
            sub: user.id,
            phone: user.phone,
            role: user.role,
        };

        const accessToken = this.jwtService.sign(payload);

        // Generate refresh token
        const refreshToken = await this.generateRefreshToken(user.id);

        // Clean up expired tokens in the background
        this.cleanupExpiredTokens(user.id).catch(() => {});

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
            refresh_token: refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                profile_image_url: user.profile_image_url,
                is_active: user.is_active,
                has_completed_profile: true, // Admins always have completed profile
            },
        };
    }

    /**
     * Refresh access token using a valid refresh token.
     * Implements token rotation: old refresh token is revoked, new one is issued.
     * 
     * @param refreshTokenRaw - The raw refresh token from the client
     * @returns New access token and refresh token
     * @throws UnauthorizedException if refresh token is invalid or expired
     */
    async refreshAccessToken(refreshTokenRaw: string): Promise<RefreshResponse> {
        const tokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');

        // Find the refresh token in DB
        const storedToken = await this.db.refreshToken.findFirst({
            where: { token_hash: tokenHash },
            include: { user: true },
        });

        if (!storedToken) {
            throw new UnauthorizedException('Invalid refresh token. Please login again.');
        }

        // Check if token is expired
        if (storedToken.expires_at < new Date()) {
            // Delete the expired token
            await this.db.refreshToken.delete({ where: { id: storedToken.id } });
            throw new UnauthorizedException('Refresh token expired. Please login again.');
        }

        // Token rotation: delete the used refresh token
        await this.db.refreshToken.delete({ where: { id: storedToken.id } });

        // Generate new access token
        const payload = {
            sub: storedToken.user.id,
            phone: storedToken.user.phone,
            role: storedToken.user.role,
        };

        const newAccessToken = this.jwtService.sign(payload);

        // Generate new refresh token (rotation)
        const newRefreshToken = await this.generateRefreshToken(storedToken.user.id);

        return {
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
        };
    }

    /**
     * Log user logout action.
     * 
     * @param userId - The ID of the user logging out
     * @param ipAddress - Client IP for audit logging
     * @returns Confirmation message
     */
    async logout(userId: string, ipAddress: string | null): Promise<{ message: string }> {
        // Revoke all refresh tokens for this user
        await this.revokeAllRefreshTokens(userId);

        await this.auditLogsService.log(
            AuditAction.USER_LOGOUT,
            'User',
            userId,
            userId,
            ipAddress,
        );

        return { message: 'Logged out successfully' };
    }
}
