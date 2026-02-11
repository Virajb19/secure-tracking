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
 * Registration roles available for mobile app users.
 * CENTER_SUPERINTENDENT is an assignable role, not a registration type.
 */
export const RegistrationRoleEnum = z.enum([
    'SEBA_OFFICER',
    'HEADMASTER',
    'TEACHER',
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

/**
 * Bank Details form schema
 */
export const BankDetailsSchema = z.object({
    accountHolderName: z.string().min(2, 'Account holder name is required'),
    accountNumber: z
        .string()
        .min(9, 'Account number should be at least 9 digits')
        .max(18, 'Account number should not exceed 18 digits')
        .regex(/^\d+$/, 'Account number should contain only digits'),
    confirmAccountNumber: z.string().min(1, 'Please confirm your account number'),
    ifscCode: z
        .string()
        .length(11, 'IFSC code must be 11 characters')
        .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format (e.g., SBIN0001234)'),
    bankName: z.string().min(2, 'Bank name is required'),
    branchName: z.string().min(2, 'Branch name is required'),
    upiId: z
        .string()
        .regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/, 'Invalid UPI ID format')
        .optional()
        .or(z.literal('')),
}).refine((data) => data.accountNumber === data.confirmAccountNumber, {
    message: 'Account numbers do not match',
    path: ['confirmAccountNumber'],
});

export type BankDetailsFormData = z.infer<typeof BankDetailsSchema>;

