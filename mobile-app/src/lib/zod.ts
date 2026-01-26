/**
 * Zod Validation Schemas
 * 
 * Form validation schemas for the mobile app.
 */

import { z } from 'zod';

/**
 * Gender options
 */
export const GenderEnum = z.enum(['MALE', 'FEMALE']);
export type Gender = z.infer<typeof GenderEnum>;

/**
 * Registration roles available for mobile app users
 */
export const RegistrationRoleEnum = z.enum([
    'SEBA_OFFICER',
    'HEADMASTER',
    'TEACHER',
    'CENTER_SUPERINTENDENT',
]);
export type RegistrationRole = z.infer<typeof RegistrationRoleEnum>;

/**
 * Registration form schema
 */
export const RegisterSchema = z.object({
    profileImage: z.string().optional(),
    gender: GenderEnum,
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.email('Please enter a valid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(15, 'Password cannot exceed 15 characters'),
    role: RegistrationRoleEnum,
    phone: z
        .string()
        .regex(/^[+]?[\d\s-]{10,15}$/, 'Please enter a valid phone number (10-15 digits)'),
});

export type RegisterFormData = z.infer<typeof RegisterSchema>;
