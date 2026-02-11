import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * DTO for creating an exam center.
 * When a school is designated as an exam center,
 * the headmaster auto-becomes Center Superintendent.
 */
export const CreateExamCenterSchema = z.object({
  school_id: z.string().uuid('Invalid school ID'),
});

export class CreateExamCenterDto extends createZodDto(CreateExamCenterSchema) {}

/**
 * DTO for overriding the Center Superintendent assignment.
 * Admin provides the email of the new CS.
 * The previous CS loses access automatically.
 */
export const OverrideSuperintendentSchema = z.object({
  email: z.email('Please provide a valid email address'),
});

export class OverrideSuperintendentDto extends createZodDto(OverrideSuperintendentSchema) {}
