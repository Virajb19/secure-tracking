import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles } from '../shared/decorators';
import { AnalyticsService } from './analytics.service';

/**
 * Analytics Controller
 * 
 * Endpoints for analytics and ratio calculations.
 */
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) {}

    /**
     * Get dashboard statistics
     * GET /api/admin/analytics/dashboard
     */
    @Get('dashboard')
    async getDashboardStats() {
        return this.analyticsService.getDashboardStats();
    }

    /**
     * Get Teacher-Student ratio for a school
     * GET /api/admin/analytics/ratio/:schoolId
     */
    @Get('ratio/:schoolId')
    async getSchoolRatio(@Param('schoolId') schoolId: string) {
        return this.analyticsService.getTeacherStudentRatio(schoolId);
    }

    /**
     * Get ratios for all schools in a district
     * GET /api/admin/analytics/district-ratios/:districtId
     */
    @Get('district-ratios/:districtId')
    async getDistrictRatios(@Param('districtId') districtId: string) {
        return this.analyticsService.getDistrictRatios(districtId);
    }

    /**
     * Get class-wise student strength for a school
     * GET /api/admin/analytics/class-strength/:schoolId
     */
    @Get('class-strength/:schoolId')
    async getClassStrength(@Param('schoolId') schoolId: string) {
        return this.analyticsService.getClassWiseStrength(schoolId);
    }
}
