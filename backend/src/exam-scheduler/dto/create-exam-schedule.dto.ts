import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Exam class levels
 */
export enum ExamClass {
  CLASS_10 = 'CLASS_10',
  CLASS_12 = 'CLASS_12',
}

/**
 * Subject category determines exam duration
 * CORE = 3 hours (9:00 AM - 12:00 PM)
 * VOCATIONAL = 2 hours (9:00 AM - 11:00 AM)
 */
export enum SubjectCategory {
  CORE = 'CORE',
  VOCATIONAL = 'VOCATIONAL',
}

// ============================
// CREATE EXAM SCHEDULE SCHEMA
// ============================

export const CreateExamScheduleSchema = z.object({
  exam_date: z.iso.date({ message: 'exam_date must be a valid date (YYYY-MM-DD)' }),

  class: z.enum(['CLASS_10', 'CLASS_12'], { message: 'class must be CLASS_10 or CLASS_12' }),

  subject: z.string().min(2, 'Subject must be at least 2 characters'),

  subject_category: z.enum(['CORE', 'VOCATIONAL'], { message: 'subject_category must be CORE or VOCATIONAL' }),

  exam_center_id: z.string().uuid('exam_center_id must be a valid UUID'),

  exam_start_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'exam_start_time must be in HH:MM format')
    .optional(),

  exam_end_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'exam_end_time must be in HH:MM format')
    .optional(),

  is_active: z.boolean().optional(),
});

export class CreateExamScheduleDto extends createZodDto(CreateExamScheduleSchema) {}

// ============================
// UPDATE EXAM SCHEDULE SCHEMA
// ============================

export const UpdateExamScheduleSchema = CreateExamScheduleSchema.partial();

export class UpdateExamScheduleDto extends createZodDto(UpdateExamScheduleSchema) {}

// ============================
// BULK CREATE EXAM SCHEDULE SCHEMA
// ============================

export const BulkCreateExamScheduleSchema = z.object({
  schedules: z
    .array(CreateExamScheduleSchema)
    .min(1, 'At least one exam schedule is required'),
});

export class BulkCreateExamScheduleDto extends createZodDto(BulkCreateExamScheduleSchema) {}

