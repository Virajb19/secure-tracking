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
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { User, UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles, CurrentUser } from '../shared/decorators';
import { AppwriteService } from '../appwrite/appwrite.service';

// File validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];

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
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUBJECT_COORDINATOR, UserRole.ASSISTANT)
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly appwriteService: AppwriteService,
    ) { }

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
        @Query('class_levels') class_levels?: string, // Comma-separated list of class levels
        @Query('subject') subject?: string,
        @Query('search') search?: string,
        @Query('is_active') is_active?: string,
        @Query('approval_status') approval_status?: string,
        @Query('exclude_roles') exclude_roles?: string,
    ) {
        return this.usersService.findAllPaginated({
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 25,
            role,
            district_id,
            school_id,
            class_level: class_level ? parseInt(class_level, 10) : undefined,
            class_levels: class_levels ? class_levels.split(',').map(l => parseInt(l, 10)) : undefined,
            subject,
            search,
            is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
            approval_status,
            exclude_roles: exclude_roles ? exclude_roles.split(',') : undefined,
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
     * Upload profile photo file.
     * Validates file type and size, uploads to Appwrite, updates user profile.
     * 
     * @param file - Uploaded file
     * @param currentUser - Authenticated admin user
     * @param request - HTTP request for IP extraction
     * @returns Updated user with new profile photo URL
     */
    @Post('me/profile-photo/upload')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('file'))
    async uploadProfilePhoto(
        @UploadedFile() file: Express.Multer.File,
        @CurrentUser() currentUser: User,
        @Req() request: Request,
    ): Promise<{ user: User; photoUrl: string }> {
        // Validate file exists
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        // Validate file size (server-side)
        if (file.size > MAX_FILE_SIZE) {
            throw new BadRequestException(
                `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
            );
        }

        // Validate file type (server-side)
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new BadRequestException(
                `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
            );
        }

        // Delete old photo from Appwrite if exists
        if (currentUser.profile_image_url) {
            try {
                await this.appwriteService.deleteFile(currentUser.profile_image_url);
            } catch (e) {
                // Log but don't fail the upload if old photo deletion fails
                console.error('Failed to delete old profile photo:', e);
            }
        }

        // Upload to Appwrite
        const photoUrl = await this.appwriteService.uploadFile(
            file.buffer,
            file.originalname,
            file.mimetype,
        );

        if (!photoUrl) {
            throw new BadRequestException('Failed to upload file to storage');
        }

        // Update user profile
        const ipAddress = this.extractIpAddress(request);
        const user = await this.usersService.updateProfilePhoto(
            currentUser.id,
            photoUrl,
            ipAddress,
        );

        return { user, photoUrl };
    }

    /**
     * Update current user's profile photo.
     * Admin only endpoint.
     * 
     * @param body - Profile image URL
     * @param currentUser - Authenticated admin user
     * @param request - HTTP request for IP extraction
     * @returns Updated user
     */
    @Patch('me/profile-photo')
    @HttpCode(HttpStatus.OK)
    async updateProfilePhoto(
        @Body() body: { profile_image_url: string },
        @CurrentUser() currentUser: User,
        @Req() request: Request,
    ): Promise<User> {
        const ipAddress = this.extractIpAddress(request);
        return this.usersService.updateProfilePhoto(
            currentUser.id,
            body.profile_image_url,
            ipAddress,
        );
    }

    /**
     * Reset user's device binding.
     * Allows the user to login from a new device.
     * Admin only endpoint.
     * 
     * @param userId - User ID to reset device
     * @param currentUser - Authenticated admin user
     * @param request - HTTP request for IP extraction
     * @returns Updated user
     */
    @Patch(':userId/reset-device')
    @HttpCode(HttpStatus.OK)
    async resetDevice(
        @Param('userId') userId: string,
        @CurrentUser() currentUser: User,
        @Req() request: Request,
    ): Promise<User> {
        const ipAddress = this.extractIpAddress(request);
        return this.usersService.resetDeviceId(
            userId,
            currentUser.id,
            ipAddress,
        );
    }

    /**
     * Get user's teaching assignments.
     * Returns class levels the user teaches.
     * 
     * @param userId - User ID
     * @returns Teaching assignments array
     */
    @Get(':userId/teaching-assignments')
    async getTeachingAssignments(
        @Param('userId') userId: string,
    ): Promise<{ class_level: number; subject: string }[]> {
        return this.usersService.getTeachingAssignments(userId);
    }

    /**
     * Approve or reject a faculty member.
     * Admin only endpoint.
     * Updates the approval_status of the user's faculty record.
     * 
     * @param userId - User ID to approve/reject
     * @param body - Status (APPROVED or REJECTED) and optional rejection_reason
     * @param currentUser - Authenticated admin user
     * @param request - HTTP request for IP extraction
     * @returns Updated user with faculty
     */
    @Patch(':userId/approve')
    @HttpCode(HttpStatus.OK)
    async approveUser(
        @Param('userId') userId: string,
        @Body() body: { status: 'APPROVED' | 'REJECTED'; rejection_reason?: string },
        @CurrentUser() currentUser: User,
        @Req() request: Request,
    ) {
        const ipAddress = this.extractIpAddress(request);
        return this.usersService.updateApprovalStatus(
            userId,
            body.status,
            currentUser.id,
            ipAddress,
            body.rejection_reason,
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
