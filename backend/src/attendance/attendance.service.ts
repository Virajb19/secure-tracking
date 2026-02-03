import {
    Injectable,
    BadRequestException,
    ConflictException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { Attendance } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { AuditLogsService, AuditAction } from '../audit-logs/audit-logs.service';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Attendance Service.
 * 
 * Handles geo-fenced attendance marking for NBSE officers.
 * 
 * FEATURES:
 * - Photo capture with SHA-256 hash for integrity
 * - GPS location validation using Haversine formula
 * - Geo-fence check against task pickup/destination coordinates
 * - Attendance records are immutable (no update/delete)
 */
@Injectable()
export class AttendanceService {
    constructor(
        private readonly db: PrismaService,
        private readonly auditLogsService: AuditLogsService,
    ) { }

    /**
     * Mark attendance for a task at a specific location.
     * 
     * @param taskId - Task UUID
     * @param createDto - Attendance data (location type, coordinates)
     * @param imageFile - Photo file from officer
     * @param userId - Officer's user ID
     * @param ipAddress - Client IP address
     * @returns Created attendance record
     */
    async markAttendance(
        taskId: string,
        createDto: CreateAttendanceDto,
        imageFile: Express.Multer.File,
        userId: string,
        ipAddress: string | null,
    ): Promise<Attendance> {
        // 1. Validate task exists and user is assigned
        const task = await this.db.task.findUnique({
            where: { id: taskId },
            include: { assigned_user: true },
        });

        if (!task) {
            throw new NotFoundException('Task not found');
        }

        if (task.assigned_user_id !== userId) {
            throw new ForbiddenException('You are not assigned to this task');
        }

        // 2. Check if attendance already marked for this location
        const existingAttendance = await this.db.attendance.findUnique({
            where: {
                task_id_location_type: {
                    task_id: taskId,
                    location_type: createDto.location_type,
                },
            },
        });

        if (existingAttendance) {
            throw new ConflictException(
                `Attendance already marked for ${createDto.location_type} location`,
            );
        }

        // 3. Get target coordinates based on location type
        let targetLat: number | null = null;
        let targetLng: number | null = null;

        if (createDto.location_type === 'PICKUP') {
            targetLat = task.pickup_latitude ? Number(task.pickup_latitude) : null;
            targetLng = task.pickup_longitude ? Number(task.pickup_longitude) : null;
        } else {
            targetLat = task.destination_latitude ? Number(task.destination_latitude) : null;
            targetLng = task.destination_longitude ? Number(task.destination_longitude) : null;
        }

        // 4. Calculate distance and check geo-fence
        let distance: number | null = null;
        let isWithinGeofence = false;

        if (targetLat !== null && targetLng !== null) {
            distance = this.calculateDistance(
                createDto.latitude,
                createDto.longitude,
                targetLat,
                targetLng,
            );
            isWithinGeofence = distance <= task.geofence_radius;
        }

        // 5. Calculate image hash for integrity
        const imageHash = this.calculateSHA256(imageFile.buffer);

        // 6. Save image to storage
        const imageUrl = await this.saveImage(imageFile, taskId, createDto.location_type);

        // 7. Create attendance record
        const attendance = await this.db.attendance.create({
            data: {
                task_id: taskId,
                user_id: userId,
                image_url: imageUrl,
                image_hash: imageHash,
                latitude: createDto.latitude,
                longitude: createDto.longitude,
                is_within_geofence: isWithinGeofence,
                distance_from_target: distance,
                location_type: createDto.location_type,
                server_timestamp: new Date(),
            },
        });

        // 8. Log to audit trail
        await this.auditLogsService.log(
            userId,
            `ATTENDANCE_MARKED: ${createDto.location_type}` as AuditAction,
            'Attendance',
            attendance.id,
            ipAddress,
        );

        console.log(`[Attendance] Officer ${userId} marked ${createDto.location_type} attendance for task ${taskId}`);
        console.log(`[Attendance] Distance: ${distance?.toFixed(2)}m, Within geofence: ${isWithinGeofence}`);

        return attendance;
    }

    /**
     * Get all attendance records for a task.
     * Used by admin CMS to view attendance.
     * 
     * @param taskId - Task UUID
     * @returns Array of attendance records
     */
    async findByTaskId(taskId: string): Promise<Attendance[]> {
        return this.db.attendance.findMany({
            where: { task_id: taskId },
            orderBy: { created_at: 'asc' },
        });
    }

    /**
     * Calculate distance between two GPS coordinates using Haversine formula.
     * 
     * @param lat1 - Latitude of first point
     * @param lon1 - Longitude of first point
     * @param lat2 - Latitude of second point
     * @param lon2 - Longitude of second point
     * @returns Distance in meters
     */
    private calculateDistance(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number,
    ): number {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    }

    /**
     * Calculate SHA-256 hash of image buffer.
     * Used for integrity verification.
     */
    private calculateSHA256(buffer: Buffer): string {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    /**
     * Save image to storage and return URL/path.
     * Creates attendance-specific subfolder.
     */
    private async saveImage(
        file: Express.Multer.File,
        taskId: string,
        locationType: string,
    ): Promise<string> {
        const uploadsDir = path.join(process.cwd(), 'uploads', 'attendance', taskId);

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Generate filename
        const timestamp = Date.now();
        const extension = file.originalname.split('.').pop() || 'jpg';
        const filename = `${locationType.toLowerCase()}_${timestamp}.${extension}`;
        const filepath = path.join(uploadsDir, filename);

        // Write file
        fs.writeFileSync(filepath, file.buffer);

        // Return relative URL
        return `/uploads/attendance/${taskId}/${filename}`;
    }
}
