import {
    Controller,
    Post,
    Body,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService, LoginResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';

/**
 * Authentication Controller.
 * Provides login endpoint for all users.
 * 
 * Endpoints (from API Contract):
 * - POST /api/auth/login
 * 
 * NOTE: This endpoint is NOT protected by JWT guard
 * since it's used to obtain the token.
 */
@Controller('api/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    /**
     * User login endpoint.
     * 
     * Authentication flow:
     * 1. Validate phone number exists
     * 2. Check user is active
     * 3. For DELIVERY users: validate/bind device_id
     * 4. Generate and return JWT token
     * 
     * @param loginDto - Login credentials (phone, device_id)
     * @param request - HTTP request for IP extraction
     * @returns JWT access token and user info
     */
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() loginDto: LoginDto,
        @Req() request: Request,
    ): Promise<LoginResponse> {
        const ipAddress = this.extractIpAddress(request);
        return this.authService.login(loginDto, ipAddress);
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
}
