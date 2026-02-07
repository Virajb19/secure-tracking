import {
    Controller,
    Post,
    Get,
    Body,
    Req,
    Res,
    HttpCode,
    HttpStatus,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { AuthService, LoginResponse, RegisterResponse, RefreshResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Roles } from '@/shared/decorators';
import { UsersService } from '../users/users.service';
import { env } from '@/env.validation';

/**
 * Multer config for profile image upload
 */
const profileImageMulterOptions = {
    storage: memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    },
    fileFilter: (req: any, file: Express.Multer.File, callback: Function) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            callback(null, true);
        } else {
            callback(new BadRequestException('Only JPEG, PNG, and WebP images are allowed'), false);
        }
    },
};

/**
 * Authentication Controller.
 * Provides login and register endpoints.
 * 
 * Endpoints:
 * - POST /api/auth/login - User login
 * - POST /api/auth/admin/login - Admin-only login
 * - POST /api/auth/register - User registration (non-admin only)
 * - POST /api/auth/refresh - Refresh access token
 * - POST /api/auth/upload-profile-image - Upload profile image
 * - POST /api/auth/logout - Logout (revokes refresh tokens)
 * - GET /api/auth/me - Get current user profile
 * 
 * NOTE: These endpoints are NOT protected by JWT guard
 * since they are used before authentication.
 */
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly usersService: UsersService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Set refresh token as an HttpOnly secure cookie on the response.
     */
    private setRefreshTokenCookie(res: Response, refreshToken: string): void {
        const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,                          // JS cannot access this cookie
            secure: isProduction,                    // HTTPS only in production
            sameSite: isProduction ? 'strict' : 'lax', // Strict in prod, Lax in dev for cross-port
            path: '/api/auth',                       // Only sent to auth endpoints
            maxAge: this.parseMaxAge(),               // Match refresh token expiry
        });
    }

    /**
     * Clear the refresh token cookie.
     */
    private clearRefreshTokenCookie(res: Response): void {
        const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

        res.cookie('refreshToken', '', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            path: '/api/auth',
            maxAge: 0,
        });
    }

    /**
     * Set access token as an HttpOnly secure cookie on the response.
     * This enables cookie-based auth — the JWT strategy reads from this cookie.
     */
    private setAccessTokenCookie(res: Response, accessToken: string): void {
        const isProduction = env.NODE_ENV === 'production';

        res.cookie('accessToken', accessToken, {
            httpOnly: true,                          // JS cannot access this cookie
            secure: isProduction,                    // HTTPS only in production
            sameSite: isProduction ? 'strict' : 'lax', // Strict in prod, Lax in dev for cross-port
            path: '/',                               // Sent with ALL requests (needed for Next.js SSR cookie forwarding)
            maxAge: this.parseAccessTokenMaxAge(),    // Match JWT expiry
        });
    }

    /**
     * Clear the access token cookie.
     */
    private clearAccessTokenCookie(res: Response): void {
        const isProduction = env.NODE_ENV === 'production';

        res.cookie('accessToken', '', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            path: '/',
            maxAge: 0,
        });
    }

    /**
     * Parse REFRESH_TOKEN_EXPIRES_IN env var to milliseconds for cookie maxAge.
     */
    private parseMaxAge(): number {
        const duration = this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN', '7d');
        const match = duration.match(/^(\d+)(s|m|h|d)$/);
        if (!match) return 7 * 24 * 60 * 60 * 1000; // fallback 7 days
        const value = parseInt(match[1]);
        switch (match[2]) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return 7 * 24 * 60 * 60 * 1000;
        }
    }

    /**
     * Parse JWT_EXPIRES_IN env var to milliseconds for access token cookie maxAge.
     */
    private parseAccessTokenMaxAge(): number {
        const duration = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
        const match = duration.match(/^(\d+)(s|m|h|d)$/);
        if (!match) return 15 * 60 * 1000; // fallback 15 minutes
        const value = parseInt(match[1]);
        switch (match[2]) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return 15 * 60 * 1000;
        }
    }

    /**
     * User login endpoint.
     * 
     * Authentication flow:
     * 1. Validate credentials (email+password or phone)
     * 2. Check user is active
     * 3. For mobile users: validate/bind device_id
     * 4. Generate and return JWT token
     * 
     * @param loginDto - Login credentials (email, password, phone, device_id)
     * @param request - HTTP request for IP extraction
     * @returns JWT access token and user info
     */
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() loginDto: LoginDto,
        @Req() request: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<LoginResponse> {
        const ipAddress = this.extractIpAddress(request);
        const result = await this.authService.login(loginDto, ipAddress);

        // Set tokens as HttpOnly cookies
        this.setRefreshTokenCookie(res, result.refresh_token);
        this.setAccessTokenCookie(res, result.access_token);

        return result;
    }

    /**
     * User registration endpoint.
     * 
     * SECURITY NOTES:
     * - Only non-admin roles can register (SEBA_OFFICER, HEADMASTER, TEACHER, CENTER_SUPERINTENDENT)
     * - ADMIN and SUPER_ADMIN users cannot register via this endpoint
     * - Registered users are inactive by default (requires admin approval)
     * 
     * @param registerDto - Registration data
     * @param request - HTTP request for IP extraction
     * @returns Registration confirmation
     */
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(
        @Body() registerDto: RegisterDto,
        @Req() request: Request,
    ): Promise<RegisterResponse> {
        const ipAddress = this.extractIpAddress(request);
        return this.authService.register(registerDto, ipAddress);
    }

    /**
     * Admin-only login endpoint for CMS.
     * 
     * SECURITY NOTES:
     * - Only ADMIN and SUPER_ADMIN users can login via this endpoint
     * - Other roles will receive a 403 Forbidden error
     * - Use this endpoint for the Admin CMS application
     * 
     * @param loginDto - Login credentials (email + password)
     * @param request - HTTP request for IP extraction
     * @returns JWT access token and user info
     */
    @Post('admin/login')
    @HttpCode(HttpStatus.OK)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async adminLogin(
        @Body() loginDto: LoginDto,
        @Req() request: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<LoginResponse> {
        const ipAddress = this.extractIpAddress(request);
        const result = await this.authService.adminLogin(loginDto, ipAddress);

        console.log(result);

        // Set tokens as HttpOnly cookies
        this.setRefreshTokenCookie(res, result.refresh_token);
        this.setAccessTokenCookie(res, result.access_token);

        return result;
    }

    /**
     * Refresh access token endpoint.
     * 
     * Reads refresh token from HttpOnly cookie (admin CMS) or request body (mobile app).
     * Uses a valid refresh token to issue a new access token and
     * a rotated refresh token. The old refresh token is revoked.
     * 
     * @param body - Optional object containing the refresh_token (for mobile app backward compat)
     * @param request - HTTP request (cookies contain refresh token for CMS)
     * @returns New access_token and refresh_token
     */
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(
        @Body() body: { refresh_token?: string },
        @Req() request: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<RefreshResponse> {
        // Prefer HttpOnly cookie, fall back to body (mobile app backward compat)
        const refreshToken = request.cookies?.refreshToken || body.refresh_token;

        if (!refreshToken) {
            throw new BadRequestException('refresh_token is required');
        }

        const result = await this.authService.refreshAccessToken(refreshToken);

        // Set the new tokens as HttpOnly cookies
        this.setRefreshTokenCookie(res, result.refresh_token);
        this.setAccessTokenCookie(res, result.access_token);

        return result;
    }

    /**
     * Extract client IP address from request.
     * Handles proxied requests (X-Forwarded-For header).
     */
    private extractIpAddress(request: Request): string {
        const forwarded = request.headers['x-forwarded-for'];
        if (forwarded) {
            const forwardedIps = Array.isArray(forwarded) ? forwarded[0] : forwarded;
            return forwardedIps.split(',')[0].trim();
        }
        return request.ip || request.socket.remoteAddress || 'unknown';
    }

    /**
     * Get current user profile.
     * Returns the authenticated user's data including is_active status.
     * 
     * @param request - HTTP request (contains user from JWT strategy)
     * @returns User profile data
     */
    @Get('me')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    async getMe(@Req() request: Request) {
        // The JWT strategy returns the full user object
        const user = request.user as any;
        
        if (!user) {
            throw new BadRequestException('User not found');
        }

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            gender: user.gender,
            profile_image_url: user.profile_image_url,
            is_active: user.is_active,
        };
    }

    /**
     * Logout endpoint.
     * Logs the logout action to audit logs.
     * This endpoint requires JWT authentication.
     * 
     * @param request - HTTP request (contains user info from JWT)
     * @returns Confirmation message
     */
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    async logout(
        @Req() request: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<{ message: string }> {
        const user = request.user as { userId: string };
        const ipAddress = this.extractIpAddress(request);

        // Clear auth cookies
        this.clearRefreshTokenCookie(res);
        this.clearAccessTokenCookie(res);

        return this.authService.logout(user.userId, ipAddress);
    }

    /**
     * Upload profile image endpoint.
     * Used during registration to upload profile image before creating user.
     * 
     * @param image - Profile image file
     * @returns URL of uploaded image
     */
    @Post('upload-profile-image')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('image', profileImageMulterOptions))
    async uploadProfileImage(
        @UploadedFile() image: Express.Multer.File,
    ): Promise<{ url: string }> {
        if (!image) {
            throw new BadRequestException('Image file is required');
        }

        // Create uploads/profiles directory if not exists
        const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const extension = path.extname(image.originalname) || '.jpg';
        const filename = `profile_${timestamp}_${randomStr}${extension}`;
        const filepath = path.join(uploadsDir, filename);

        // Write file to disk
        fs.writeFileSync(filepath, image.buffer);

        // Return URL (relative path that can be served by static files)
        const url = `/uploads/profiles/${filename}`;

        console.log('[Auth] Profile image uploaded:', url);

        return { url };
    }
}
