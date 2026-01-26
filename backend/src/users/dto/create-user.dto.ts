import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';

/**
 * Zod schema for creating a new user.
 * Used by admin to create ADMIN or DELIVERY users.
 */
export const CreateUserSchema = z.object({
  /**
   * Full name of the user.
   */
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must be at most 255 characters'),

  /**
   * Phone number (unique identifier for login).
   * Must be a valid phone number format.
   */
  phone: z
    .string()
    .regex(
      /^[+]?[\d\s-]{10,15}$/,
      'Phone must be a valid phone number (10–15 digits)',
    ),

  /**
   * Password for the user.
   * Must be at least 6 characters.
   */
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be at most 100 characters'),

  /**
   * User role - ADMIN or DELIVERY.
   */
  role: z.enum(UserRole, {
    message: 'Role must be either ADMIN or DELIVERY',
  }),

  /**
   * Whether the user is active.
   * Defaults to true if not provided.
   */
  is_active: z.boolean().optional().default(true),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export class CreateUserDto extends createZodDto(CreateUserSchema) {}
