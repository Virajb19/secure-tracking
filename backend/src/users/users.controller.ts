import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { User, UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles, CurrentUser } from '../shared/decorators';

/**
 * Users Controller.
 * Provides admin-only endpoints for user management.
 * 
 * Endpoints (from API Contract):
 * - POST /api/admin/users - Create a new user
 * - GET /api/admin/users - List all users
 */
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
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
     * Get users with pagination and filters.
     * Admin only endpoint.
     * 
     * @param page - Page number (1-indexed), defaults to 1
     * @param limit - Items per page, defaults to 25
     * @param role - Filter by role
     * @param district_id - Filter by district
     * @param school_id - Filter by school
     * @param search - Search by name, phone, email
     * @param is_active - Filter by active status
     * @returns Paginated users with total count
     */
    @Get()
    async findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('role') role?: string,
        @Query('district_id') district_id?: string,
        @Query('school_id') school_id?: string,
        @Query('class_level') class_level?: string,
        @Query('subject') subject?: string,
        @Query('search') search?: string,
        @Query('is_active') is_active?: string,
    ) {
        return this.usersService.findAllPaginated({
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 25,
            role,
            district_id,
            school_id,
            class_level: class_level ? parseInt(class_level, 10) : undefined,
            subject,
            search,
            is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
        });
    }

    /**
     * Toggle user active status.
     * Admin only endpoint.
     * 
     * @param userId - User ID to toggle
     * @param toggleStatusDto - New status data
     * @param currentUser - Authenticated admin user
     * @param request - HTTP request for IP extraction
     * @returns Updated user
     */
    @Patch(':userId/status')
    @HttpCode(HttpStatus.OK)
    async toggleStatus(
        @Param('userId') userId: string,
        @Body() toggleStatusDto: ToggleUserStatusDto,
        @CurrentUser() currentUser: User,
        @Req() request: Request,
    ): Promise<User> {
        const ipAddress = this.extractIpAddress(request);
        return this.usersService.toggleActiveStatus(
            userId,
            toggleStatusDto.is_active,
            currentUser.id,
            ipAddress,
        );
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
