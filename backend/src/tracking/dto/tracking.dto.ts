import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Location update from mobile app agent.
 * Sent via WebSocket every 3-5 seconds during active task.
 */
export const LocationUpdateSchema = z.object({
    /**
     * The task ID the agent is currently working on.
     */
    task_id: z.uuid({
        message: 'task_id must be a valid UUID',
    }),

    /**
     * Agent's current latitude (-90 to 90).
     */
    latitude: z
        .number()
        .min(-90, 'Latitude must be between -90 and 90')
        .max(90, 'Latitude must be between -90 and 90'),

    /**
     * Agent's current longitude (-180 to 180).
     */
    longitude: z
        .number()
        .min(-180, 'Longitude must be between -180 and 180')
        .max(180, 'Longitude must be between -180 and 180'),

    /**
     * GPS accuracy in meters (optional).
     */
    accuracy: z.number().positive().optional(),

    /**
     * Heading/direction in degrees (0-360, optional).
     */
    heading: z.number().min(0).max(360).optional(),

    /**
     * Speed in m/s (optional).
     */
    speed: z.number().min(0).optional(),

    /**
     * Timestamp when location was captured on the device (ISO 8601).
     */
    recorded_at: z.iso.datetime({
        message: 'recorded_at must be a valid ISO 8601 date string',
    }),
});

export type LocationUpdateInput = z.infer<typeof LocationUpdateSchema>;
export class LocationUpdateDto extends createZodDto(LocationUpdateSchema) { }

/**
 * Subscribe to task tracking updates (for Admin CMS).
 */
export const SubscribeTaskSchema = z.object({
    task_id: z.uuid({
        message: 'task_id must be a valid UUID',
    }),
});

export type SubscribeTaskInput = z.infer<typeof SubscribeTaskSchema>;
export class SubscribeTaskDto extends createZodDto(SubscribeTaskSchema) { }
