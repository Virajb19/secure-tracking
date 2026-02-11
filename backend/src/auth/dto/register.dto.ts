import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Registration Schema
 * 
 * Used for mobile app user registration.
 * ADMIN and SUPER_ADMIN users cannot register via this endpoint.
 * They are created directly in the database or by another admin.
 */
export const RegisterSchema = z.object({
    // Profile image URL (optional, uploaded separately)
    profile_image_url: z.string().optional(),

    // Gender selection
    gender: z.enum(['MALE', 'FEMALE']).refine((val) => val !== undefined, {
        message: 'Gender is required',
    }),

    // Full name
    name: z.string().min(2, 'Name must be at least 2 characters').max(255),

    // Email address
    email: z.email('Please enter a valid email').trim(),

    // Password (8-15 characters)
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(15, 'Password cannot exceed 15 characters'),

    // Role - only non-admin roles allowed (CENTER_SUPERINTENDENT is assigned, not registered)
    role:  z
  .enum([
    "SEBA_OFFICER",
    "HEADMASTER",
    "TEACHER",
  ])
  .refine((val) => val !== undefined, {
    message: "Role is required",
  }),

    // Phone number
    phone: z.string().regex(/^[+]?[\d\s-]{10,15}$/, 'Please enter a valid phone number'),
});

export class RegisterDto extends createZodDto(RegisterSchema) {}
