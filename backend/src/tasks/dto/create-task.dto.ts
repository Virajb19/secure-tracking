import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Zod schema for creating a new delivery task.
 * Used by admin to assign tasks to DELIVERY users.
 *
 * NOTES:
 * - status is NOT included (defaults to PENDING)
 * - created_at is server-generated
 */
export const CreateTaskSchema = z.object({
  /**
   * Unique sealed pack identifier.
   * Used for physical verification during delivery.
   */
  sealed_pack_code: z
    .string()
    .min(3, 'Sealed pack code must be at least 3 characters')
    .max(100, 'Sealed pack code must be at most 100 characters'),

  /**
   * Pickup location for the delivery.
   */
  source_location: z
    .string()
    .min(1, 'Source location is required'),

  /**
   * Final delivery destination.
   */
  destination_location: z
    .string()
    .min(1, 'Destination location is required'),

  /**
   * UUID of the DELIVERY user to assign this task to.
   */
  assigned_user_id: z.uuid({
    message: 'Assigned user ID must be a valid UUID',
  }),

  /**
   * Start of allowed delivery window (ISO 8601 format).
   */
  start_time: z.iso.datetime({
    message: 'Start time must be a valid ISO 8601 date string',
  }),

  /**
   * End of allowed delivery window (ISO 8601 format).
   */
  end_time: z.iso.datetime({
    message: 'End time must be a valid ISO 8601 date string',
  }),

  /**
   * Type of exam - REGULAR or COMPARTMENTAL.
   * Defaults to REGULAR if not specified.
   */
  exam_type: z
    .enum(['REGULAR', 'COMPARTMENTAL'])
    .optional()
    .default('REGULAR'),

  // ===== GEO-FENCE COORDINATES (OPTIONAL) =====

  /**
   * Pickup location coordinates for geo-fence validation.
   */
  pickup_latitude: z.coerce.number().min(-90).max(90).optional(),
  pickup_longitude: z.coerce.number().min(-180).max(180).optional(),

  /**
   * Destination location coordinates for geo-fence validation.
   */
  destination_latitude: z.coerce.number().min(-90).max(90).optional(),
  destination_longitude: z.coerce.number().min(-180).max(180).optional(),

  /**
   * Geo-fence radius in meters.
   * Default is 100 meters if not specified.
   */
  geofence_radius: z.coerce.number().min(10).max(1000).optional().default(100),
})
  .refine(
    (data) => new Date(data.end_time) > new Date(data.start_time),
    {
      message: 'End time must be after start time',
      path: ['end_time'],
    },
  );

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export class CreateTaskDto extends createZodDto(CreateTaskSchema) { }
