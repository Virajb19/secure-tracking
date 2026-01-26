import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Teaching class with subjects.
 */
const TeachingClassSchema = z.object({
    class_level: z.number().int().min(1).max(12),
    subjects: z.array(z.string().min(1)).min(1),
});

/**
 * Schema for completing faculty profile.
 */
export const CompleteProfileSchema = z.object({
    /**
     * School ID where the faculty is employed.
     */
    school_id: z.string().uuid('Invalid school ID'),

    /**
     * Highest qualification.
     */
    highest_qualification: z.string()
        .min(2, 'Qualification must be at least 2 characters')
        .max(150, 'Qualification must be at most 150 characters'),

    /**
     * Total years of experience.
     */
    years_of_experience: z.number()
        .int('Experience must be a whole number')
        .min(0, 'Experience cannot be negative')
        .max(60, 'Experience cannot exceed 60 years'),

    /**
     * Designation (optional).
     */
    designation: z.string().max(150).optional(),

    /**
     * Teaching classes and subjects.
     * Array of class levels with their subjects.
     */
    teaching_classes: z.array(TeachingClassSchema).default([]),
});

export class CompleteProfileDto extends createZodDto(CompleteProfileSchema) {}
