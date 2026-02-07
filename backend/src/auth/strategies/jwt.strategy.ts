import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';

/**
 * JWT Token Payload structure.
 */
export interface JwtPayload {
    sub: string; // User ID
    phone: string;
    role: string;
    iat?: number;
    exp?: number;
}

/**
 * Extract JWT from the accessToken HttpOnly cookie.
 */
function extractJwtFromCookie(req: Request): string | null {
    return req?.cookies?.accessToken || null;
}

/**
 * JWT Strategy for Passport.
 * Validates JWT tokens and retrieves the user from database.
 * 
 * Token extraction order:
 * 1. Authorization: Bearer <token> header (mobile app / explicit header)
 * 2. accessToken HttpOnly cookie (cookie-based auth for CMS)
 * 
 * SECURITY:
 * - Validates token signature
 * - Checks if user still exists and is active
 * - Returns full user object for use in guards and controllers
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                extractJwtFromCookie,
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET'),
        });
    }

    /**
     * Validate JWT payload and return user.
     * Called automatically by Passport after token verification.
     * 
     * NOTE: We no longer block inactive users here. Instead, the mobile app
     * checks is_active and shows appropriate UI (pending approval screen).
     * This allows inactive users to call /auth/me to check their status.
     * 
     * @param payload - Decoded JWT payload
     * @returns User object to be attached to request
     * @throws UnauthorizedException if user not found
     */
    async validate(payload: JwtPayload) {
        try {
            const user = await this.usersService.findById(payload.sub);

            if (!user) {
                throw new UnauthorizedException('User not found. Please login again.');
            }

            // Note: Inactive users are allowed to authenticate.
            // The mobile app handles the is_active check and shows pending screen.
            // If specific endpoints need to block inactive users, they should check user.is_active.

            // Return user object - will be attached to request.user
            return user;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw new UnauthorizedException('Session expired. Please login again.');
            }
            throw error;
        }
    }
}
