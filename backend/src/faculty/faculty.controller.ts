import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { User, UserRole } from '@prisma/client';
import { FacultyService } from './faculty.service';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { UpdatePersonalDetailsDto } from '../users/dto/update-personal-details.dto';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles, CurrentUser } from '../shared/decorators';

/**
 * Faculty Controller.
 * Provides endpoints for faculty profile management.
 */
@Controller('faculty')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.HEADMASTER, UserRole.CENTER_SUPERINTENDENT, UserRole.SEBA_OFFICER)
export class FacultyController {
    constructor(
        private readonly facultyService: FacultyService,
        private readonly usersService: UsersService,
    ) {}

    /**
     * Get current user's faculty profile.
     */
    @Get('profile')
    async getProfile(@CurrentUser() user: User) {
        const faculty = await this.facultyService.getByUserId(user.id);
        return {
            has_profile: faculty !== null,
            faculty,
        };
    }

    /**
     * Complete faculty profile.
     */
    @Post('profile/complete')
    @HttpCode(HttpStatus.OK)
    async completeProfile(
        @Body() dto: CompleteProfileDto,
        @CurrentUser() user: User,
        @Req() request: Request,
    ) {
        const ipAddress = this.extractIpAddress(request);
        const faculty = await this.facultyService.completeProfile(
            user.id,
            dto,
            ipAddress,
        );
        return {
            success: true,
            faculty,
        };
    }

    /**
     * Check if profile is completed.
     */
    @Get('profile/status')
    async getProfileStatus(@CurrentUser() user: User) {
        const hasProfile = await this.facultyService.hasCompletedProfile(user.id);
        return {
            has_completed_profile: hasProfile,
        };
    }

    /**
     * Get colleagues (other faculty at the same school).
     */
    @Get('colleagues')
    async getColleagues(@CurrentUser() user: User) {
        return this.facultyService.getColleagues(user.id);
    }

    /**
     * Update personal details (name, phone, gender).
     * This endpoint allows users to update their basic info.
     */
    @Patch('personal-details')
    @HttpCode(HttpStatus.OK)
    async updatePersonalDetails(
        @Body() dto: UpdatePersonalDetailsDto,
        @CurrentUser() user: User,
        @Req() request: Request,
    ) {
        const ipAddress = this.extractIpAddress(request);
        const updatedUser = await this.usersService.updatePersonalDetails(
            user.id,
            dto,
            ipAddress,
        );
        return {
            success: true,
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                phone: updatedUser.phone,
                gender: updatedUser.gender,
                email: updatedUser.email,
            },
        };
    }

    private extractIpAddress(request: Request): string {
        const forwarded = request.headers['x-forwarded-for'];
        if (forwarded) {
            const forwardedIps = Array.isArray(forwarded) ? forwarded[0] : forwarded;
            return forwardedIps.split(',')[0].trim();
        }
        return request.ip || request.socket.remoteAddress || 'unknown';
    }
}
