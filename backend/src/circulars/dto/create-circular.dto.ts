import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateCircularSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must not exceed 200 characters'),

  description: z
    .string()
    .max(2000, 'Description too long')
    .optional(),

  issued_by: z
    .string()
    .min(1, 'Issued by is required')
    .max(100),

  issued_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Issued date must be YYYY-MM-DD'),

  effective_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Effective date must be YYYY-MM-DD')
    .optional(),

  district_id: z
    .string()
    .uuid('Invalid district ID')
    .optional(),

  // Support single school_id (legacy) or multiple school_ids
  school_id: z
    .string()
    .uuid('Invalid school ID')
    .optional(),

  // Array of school IDs for multiple school selection
  school_ids: z
    .array(z.string().uuid('Invalid school ID'))
    .optional(),
});

export class CreateCircularDto extends createZodDto(
  CreateCircularSchema,
) {}
