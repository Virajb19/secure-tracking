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
    .uuid('Invalid district ID')
    .optional(),

  // Support single school_id (legacy) or multiple school_ids
  school_id: z
    .uuid('Invalid school ID')
    .optional(),

  // Array of school IDs for multiple school selection
  school_ids: z
    .array(z.string().uuid('Invalid school ID'))
    .optional(),

  // File URL from Appwrite storage (validated on upload - max 10MB)
  file_url: z
    .url('Invalid file URL')
    .optional(),

  // Original file name
  file_name: z
    .string()
    .max(255, 'File name too long')
    .optional(),
});

// Maximum file size for circular uploads: 10MB
export const CIRCULAR_MAX_FILE_SIZE = 10 * 1024 * 1024;

export class CreateCircularDto extends createZodDto(
  CreateCircularSchema,
) {}
