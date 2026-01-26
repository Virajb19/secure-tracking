import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
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
 * JWT Strategy for Passport.
 * Validates JWT tokens and retrieves the user from database.
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
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET'),
        });
    }

    /**
     * Validate JWT payload and return user.
     * Called automatically by Passport after token verification.
     * 
     * @param payload - Decoded JWT payload
     * @returns User object to be attached to request
     * @throws UnauthorizedException if user not found or inactive
     */
    async validate(payload: JwtPayload) {
        try {
            const user = await this.usersService.findById(payload.sub);

            if (!user) {
                throw new UnauthorizedException('User not found. Please login again.');
            }

            if (!user.is_active) {
                throw new UnauthorizedException('User account is deactivated');
            }

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
