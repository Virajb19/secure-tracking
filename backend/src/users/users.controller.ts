import {
    Controller,
    Get,
    Post,
    Body,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles, CurrentUser } from '../shared/decorators';
import { UserRole } from '../shared/enums';
import { User } from './entities/user.entity';

/**
 * Users Controller.
 * Provides admin-only endpoints for user management.
 * 
 * Endpoints (from API Contract):
 * - POST /api/admin/users - Create a new user
 * - GET /api/admin/users - List all users
 */
@Controller('api/admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    /**
     * Create a new user.
     * Admin only endpoint.
     * 
     * @param createUserDto - User creation data
     * @param currentUser - Authenticated admin user
     * @param request - HTTP request for IP extraction
     * @returns Created user
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() createUserDto: CreateUserDto,
        @CurrentUser() currentUser: User,
        @Req() request: Request,
    ): Promise<User> {
        const ipAddress = this.extractIpAddress(request);
        return this.usersService.create(createUserDto, currentUser.id, ipAddress);
    }

    /**
     * Get all users.
     * Admin only endpoint.
     * 
     * @returns Array of all users
     */
    @Get()
    async findAll(): Promise<User[]> {
        return this.usersService.findAll();
    }

    /**
     * Extract client IP address from request.
     * Handles proxied requests (X-Forwarded-For header).
     */
    private extractIpAddress(request: Request): string {
        const forwarded = request.headers['x-forwarded-for'];
        if (forwarded) {
            // X-Forwarded-For can contain multiple IPs, take the first one
            const forwardedIps = Array.isArray(forwarded) ? forwarded[0] : forwarded;
            return forwardedIps.split(',')[0].trim();
        }
        return request.ip || request.socket.remoteAddress || 'unknown';
    }
}
