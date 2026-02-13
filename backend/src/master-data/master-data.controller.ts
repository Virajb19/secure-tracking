import { Controller, Get, Post, Patch, Delete, Query, Param, Body, UseGuards, HttpCode } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MasterDataService } from './master-data.service';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles } from '../shared/decorators';
import { CreateSchoolDto, UpdateSchoolDto } from './dto/create-school.dto';
import { CreateSubjectDto, CreateSubjectBulkDto, UpdateSubjectDto } from './dto/create-subject.dto';

/**
 * Master Data Controller (Admin).
 * Provides endpoints for districts, schools, classes, and subjects.
 * CRUD operations for schools and subjects are restricted to ADMIN/SUPER_ADMIN.
 */
@Controller('admin/master-data')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUBJECT_COORDINATOR, UserRole.ASSISTANT)
export class MasterDataController {
    constructor(private readonly masterDataService: MasterDataService) { }

    // ========================================
    // READ ENDPOINTS (all CMS roles)
    // ========================================

    @Get('districts')
    async getDistricts() {
        return this.masterDataService.getDistricts();
    }

    @Get('schools')
    async getSchools(@Query('districtId') districtId?: string) {
        return this.masterDataService.getSchools(districtId);
    }

    @Get('schools/paginated')
    async getSchoolsPaginated(
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Query('districtId') districtId?: string,
        @Query('search') search?: string,
    ) {
        return this.masterDataService.getSchoolsPaginated({
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
            districtId,
            search: search || undefined,
        });
    }

    @Get('classes')
    async getClasses() {
        return this.masterDataService.getClasses();
    }

    @Get('subjects')
    async getSubjects(@Query('classLevel') classLevel?: string) {
        const cl = classLevel ? parseInt(classLevel, 10) : undefined;
        return this.masterDataService.getSubjects(cl);
    }

    @Get('subjects/detailed')
    async getSubjectsDetailed(@Query('classLevel') classLevel?: string) {
        const cl = classLevel ? parseInt(classLevel, 10) : undefined;
        return this.masterDataService.getSubjectsDetailed(cl);
    }
}

/**
 * Admin School & Subject Management Controller.
 * CRUD operations restricted to ADMIN and SUPER_ADMIN only.
 */
@Controller('admin/manage')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminManageController {
    constructor(private readonly masterDataService: MasterDataService) { }

    // ========================================
    // SCHOOL CRUD
    // ========================================

    @Post('schools')
    @HttpCode(201)
    async createSchool(@Body() dto: CreateSchoolDto) {
        return this.masterDataService.createSchool(dto);
    }

    @Patch('schools/:id')
    async updateSchool(@Param('id') id: string, @Body() dto: UpdateSchoolDto) {
        return this.masterDataService.updateSchool(id, dto);
    }

    @Delete('schools/:id')
    @HttpCode(200)
    async deleteSchool(@Param('id') id: string) {
        return this.masterDataService.deleteSchool(id);
    }

    // ========================================
    // SUBJECT CRUD
    // ========================================

    @Post('subjects')
    @HttpCode(201)
    async createSubject(@Body() dto: CreateSubjectDto) {
        return this.masterDataService.createSubject(dto);
    }

    @Post('subjects/bulk')
    @HttpCode(201)
    async createSubjectBulk(@Body() dto: CreateSubjectBulkDto) {
        return this.masterDataService.createSubjectBulk(dto);
    }

    @Patch('subjects/:id')
    async updateSubject(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
        return this.masterDataService.updateSubject(id, dto);
    }

    @Delete('subjects/:id')
    @HttpCode(200)
    async deleteSubject(@Param('id') id: string) {
        return this.masterDataService.deleteSubject(id);
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

    @Get('districts')
    async getDistricts() {
        return this.masterDataService.getDistricts();
    }

    @Get('schools')
    async getSchools(@Query('districtId') districtId?: string) {
        return this.masterDataService.getSchools(districtId);
    }

    @Get('classes')
    async getClasses() {
        return this.masterDataService.getClasses();
    }

    @Get('subjects')
    async getSubjects(@Query('classLevel') classLevel?: string) {
        const cl = classLevel ? parseInt(classLevel, 10) : undefined;
        return this.masterDataService.getSubjects(cl);
    }
}
