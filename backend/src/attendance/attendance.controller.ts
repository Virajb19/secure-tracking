import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    FileTypeValidator,
    MaxFileSizeValidator,
    Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

/**
 * Attendance Controller.
 * 
 * Endpoints for geo-fenced attendance management.
 * 
 * ENDPOINTS:
 * POST /api/tasks/:taskId/attendance - Mark attendance (SEBA_OFFICER only)
 * GET /api/tasks/:taskId/attendance - Get attendance records (for admin CMS)
 */
@Controller('tasks/:taskId/attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) { }

    /**
     * Mark attendance at a location.
     * 
     * - Only SEBA_OFFICER can mark attendance
     * - Requires photo upload
     * - Validates geo-fence automatically
     */
    @Post()
    @Roles(UserRole.SEBA_OFFICER)
    @UseInterceptors(FileInterceptor('image'))
    async markAttendance(
        @Param('taskId') taskId: string,
        @Body() createDto: CreateAttendanceDto,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/i }),
                ],
            }),
        )
        image: Express.Multer.File,
        @Req() req: any,
    ) {
        const userId = req.user.id;
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;

        const attendance = await this.attendanceService.markAttendance(
            taskId,
            createDto,
            image,
            userId,
            ipAddress,
        );

        return {
            success: true,
            message: attendance.is_within_geofence
                ? 'Attendance marked successfully. You are within the designated area.'
                : 'Attendance marked. Note: You are outside the designated area.',
            attendance: {
                id: attendance.id,
                location_type: attendance.location_type,
                is_within_geofence: attendance.is_within_geofence,
                distance_from_target: attendance.distance_from_target
                    ? Number(attendance.distance_from_target).toFixed(2) + 'm'
                    : null,
                timestamp: attendance.server_timestamp,
            },
        };
    }

    /**
     * Get all attendance records for a task.
     * Accessible by ADMIN and SUPER_ADMIN.
     */
    @Get()
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SEBA_OFFICER)
    async getAttendance(@Param('taskId') taskId: string) {
        const records = await this.attendanceService.findByTaskId(taskId);

        return {
            success: true,
            attendance: records.map((r) => ({
                id: r.id,
                location_type: r.location_type,
                image_url: r.image_url,
                latitude: Number(r.latitude),
                longitude: Number(r.longitude),
                is_within_geofence: r.is_within_geofence,
                distance_from_target: r.distance_from_target
                    ? Number(r.distance_from_target).toFixed(2)
                    : null,
                timestamp: r.server_timestamp,
            })),
        };
    }
}
