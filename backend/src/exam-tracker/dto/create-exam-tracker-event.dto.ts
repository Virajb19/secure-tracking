import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Enum for Exam Tracker Event Types
 * Must match Prisma ExamTrackerEventType enum
 */
export enum ExamTrackerEventType {
  TREASURY_ARRIVAL = 'TREASURY_ARRIVAL',
  CUSTODIAN_HANDOVER = 'CUSTODIAN_HANDOVER',
  OPENING_MORNING = 'OPENING_MORNING',
  PACKING_MORNING = 'PACKING_MORNING',
  DELIVERY_MORNING = 'DELIVERY_MORNING',
  OPENING_AFTERNOON = 'OPENING_AFTERNOON',
  PACKING_AFTERNOON = 'PACKING_AFTERNOON',
  DELIVERY_AFTERNOON = 'DELIVERY_AFTERNOON',
}

// ============================
// CREATE EXAM TRACKER EVENT SCHEMA
// ============================

export const CreateExamTrackerEventSchema = z.object({
  event_type: z.enum([
    'TREASURY_ARRIVAL',
    'CUSTODIAN_HANDOVER',
    'OPENING_MORNING',
    'PACKING_MORNING',
    'DELIVERY_MORNING',
    'OPENING_AFTERNOON',
    'PACKING_AFTERNOON',
    'DELIVERY_AFTERNOON',
  ], { message: 'Invalid event type' }),

  exam_date: z.iso.date({ message: 'exam_date must be a valid date (YYYY-MM-DD)' }),

  shift: z.string().optional(), // MORNING, AFTERNOON, or GENERAL

  latitude: z.coerce.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),

  longitude: z.coerce.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),

  captured_at: z.iso.datetime({ message: 'captured_at must be a valid ISO datetime' }).optional(),
});

/**
 * DTO for creating an exam tracker event.
 * Used by Center Superintendents to record question paper events.
 */
export class CreateExamTrackerEventDto extends createZodDto(CreateExamTrackerEventSchema) {}

