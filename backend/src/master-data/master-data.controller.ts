import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MasterDataService } from './master-data.service';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles } from '../shared/decorators';

/**
 * Master Data Controller (Admin).
 * Provides endpoints for districts, schools, classes, and subjects.
 */
@Controller('admin/master-data')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUBJECT_COORDINATOR, UserRole.ASSISTANT)
export class MasterDataController {
    constructor(private readonly masterDataService: MasterDataService) { }

    /**
     * Get all districts.
     */
    @Get('districts')
    async getDistricts() {
        return this.masterDataService.getDistricts();
    }

    /**
     * Get all schools, optionally filtered by district.
     */
    @Get('schools')
    async getSchools(@Query('districtId') districtId?: string) {
        return this.masterDataService.getSchools(districtId);
    }

    /**
     * Get all class levels.
     */
    @Get('classes')
    async getClasses() {
        return this.masterDataService.getClasses();
    }

    /**
     * Get all subjects.
     */
    @Get('subjects')
    async getSubjects() {
        return this.masterDataService.getSubjects();
    }
}

/**
 * Public Master Data Controller.
 * Accessible by all authenticated users (for mobile app).
 */
@Controller('master-data')
@UseGuards(JwtAuthGuard)
export class PublicMasterDataController {
    constructor(private readonly masterDataService: MasterDataService) { }

    /**
     * Get all districts.
     */
    @Get('districts')
    async getDistricts() {
        return this.masterDataService.getDistricts();
    }

    /**
     * Get all schools, optionally filtered by district.
     */
    @Get('schools')
    async getSchools(@Query('districtId') districtId?: string) {
        return this.masterDataService.getSchools(districtId);
    }

    /**
     * Get all class levels (predefined).
     */
    @Get('classes')
    async getClasses() {
        // Return predefined class levels for the form
        return [8, 9, 10, 11, 12];
    }

    /**
     * Get all subjects.
     */
    @Get('subjects')
    async getSubjects() {
        return this.masterDataService.getSubjects();
    }
}
