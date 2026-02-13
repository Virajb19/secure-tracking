import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateSchoolSchema = z.object({
    name: z.string().min(1, 'School name is required').max(255, 'School name too long'),
    registration_code: z.string().min(4, 'Registration code must be at least 4 characters').max(50, 'Registration code too long'),
    district_id: z.string().uuid('Invalid district ID'),
});

export class CreateSchoolDto extends createZodDto(CreateSchoolSchema) {}

export const UpdateSchoolSchema = z.object({
    name: z.string().min(1, 'School name is required').max(255, 'School name too long').optional(),
    registration_code: z.string().min(4, 'Registration code must be at least 4 characters').max(50, 'Registration code too long').optional(),
    district_id: z.string().uuid('Invalid district ID').optional(),
});

export class UpdateSchoolDto extends createZodDto(UpdateSchoolSchema) {}
