import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateSubjectSchema = z.object({
    name: z.string().min(1, 'Subject name is required').max(150, 'Subject name too long'),
    class_level: z.coerce.number().int().min(1, 'Class level must be positive').max(12, 'Class level max is 12'),
});

export class CreateSubjectDto extends createZodDto(CreateSubjectSchema) {}

export const CreateSubjectBulkSchema = z.object({
    name: z.string().min(1, 'Subject name is required').max(150, 'Subject name too long'),
    class_levels: z.array(z.coerce.number().int().min(1).max(12)).min(1, 'At least one class level is required'),
});

export class CreateSubjectBulkDto extends createZodDto(CreateSubjectBulkSchema) {}

export const UpdateSubjectSchema = z.object({
    name: z.string().min(1, 'Subject name is required').max(150, 'Subject name too long').optional(),
    class_level: z.coerce.number().int().min(1).max(12).optional(),
    is_active: z.boolean().optional(),
});

export class UpdateSubjectDto extends createZodDto(UpdateSubjectSchema) {}
