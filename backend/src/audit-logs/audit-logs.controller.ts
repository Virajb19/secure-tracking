import { Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { AuditLog, UserRole } from '@prisma/client';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles } from '../shared/decorators';

interface AuditLogsResponse {
    data: AuditLog[];
    total: number;
    hasMore: boolean;
}

/**
 * Audit Logs Controller.
 * Provides read-only access to audit logs for ADMIN users only.
 * 
 * Endpoints:
 * - GET /api/admin/audit-logs
 */
@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AuditLogsController {
    constructor(private readonly auditLogsService: AuditLogsService) { }

    /**
     * Get all audit logs with pagination.
     * Admin only endpoint.
     * 
     * @param limit - Maximum number of records (default: 50, max: 1000)
     * @param offset - Records to skip for pagination (default: 0)
     * @returns Paginated audit log entries with total count, newest first
     */
    @Get()
    async findAll(
        @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
        @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    ): Promise<AuditLogsResponse> {
        // Enforce maximum limit to prevent excessive data retrieval
        const safeLimit = Math.min(limit, 1000);
        return this.auditLogsService.findAll(safeLimit, offset);
    }
}
