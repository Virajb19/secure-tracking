import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Zod schema for marking attendance.
 * 
 * ATTENDANCE FLOW:
 * 1. Officer opens task and navigates to attendance screen
 * 2. App captures GPS location and photo
 * 3. Backend validates geo-fence (Haversine formula)
 * 4. Attendance is recorded with geo-fence status
 */
export const CreateAttendanceSchema = z.object({
    /**
     * Type of location where attendance is being marked.
     * PICKUP - Police station / source location
     * DESTINATION - Exam center / destination location
     */
    location_type: z.enum(['PICKUP', 'DESTINATION'], {
        message: 'Location type must be PICKUP or DESTINATION',
    }),

    /**
     * GPS latitude at time of attendance.
     * Valid range: -90 to 90
     */
    latitude: z.coerce
        .number()
        .min(-90, 'Latitude must be >= -90')
        .max(90, 'Latitude must be <= 90'),

    /**
     * GPS longitude at time of attendance.
     * Valid range: -180 to 180
     */
    longitude: z.coerce
        .number()
        .min(-180, 'Longitude must be >= -180')
        .max(180, 'Longitude must be <= 180'),
});

export type CreateAttendanceInput = z.infer<typeof CreateAttendanceSchema>;

export class CreateAttendanceDto extends createZodDto(CreateAttendanceSchema) { }
