import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { EventType } from '@prisma/client';

/**
 * Zod schema for creating a task event.
 *
 * CRITICAL:
 * - No timestamp field (server-generated)
 * - Image handled separately via multipart upload
 * 
 * 5-STEP TRACKING:
 * 1. PICKUP_POLICE_STATION - Picking up papers from police station
 * 2. ARRIVAL_EXAM_CENTER - Arrived at examination center
 * 3. OPENING_SEAL - Opening the sealed papers
 * 4. SEALING_ANSWER_SHEETS - Sealing answer sheets after exam
 * 5. SUBMISSION_POST_OFFICE - Submitting to post office
 */
export const CreateTaskEventSchema = z.object({
  /**
   * Type of event being recorded.
   * Each type can only occur ONCE per task.
   */
  event_type: z.enum(
    ['PICKUP_POLICE_STATION', 'ARRIVAL_EXAM_CENTER', 'OPENING_SEAL', 'SEALING_ANSWER_SHEETS', 'SUBMISSION_POST_OFFICE'] as const,
    {
      message: 'Event type must be one of: PICKUP_POLICE_STATION, ARRIVAL_EXAM_CENTER, OPENING_SEAL, SEALING_ANSWER_SHEETS, SUBMISSION_POST_OFFICE',
    },
  ),

  /**
   * GPS latitude at time of event.
   * Valid range: -90 to 90
   */
  latitude: z.coerce
    .number()
    .min(-90, 'Latitude must be >= -90')
    .max(90, 'Latitude must be <= 90'),

  /**
   * GPS longitude at time of event.
   * Valid range: -180 to 180
   */
  longitude: z.coerce
    .number()
    .min(-180, 'Longitude must be >= -180')
    .max(180, 'Longitude must be <= 180'),
});

export type CreateTaskEventInput = z.infer<typeof CreateTaskEventSchema>;

export class CreateTaskEventDto extends createZodDto(CreateTaskEventSchema) {}
