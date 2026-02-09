import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Valid class groups for SUBJECT_COORDINATOR
export const CLASS_GROUPS = ['8-10', '11-12'] as const;
export type ClassGroup = typeof CLASS_GROUPS[number];

export const LoginSchema = z.object({
  // Admin CMS login (email + password) OR Mobile app login (email + password + phone)
  email: z.email({ message: 'Please enter a valid email' }).trim().optional(),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }).max(15, { message: 'Password cannot exceed 15 characters' }),
  // Mobile app login requires phone + device_id along with email + password
  phone: z.string().min(1, { message: "Phone number is required" }).regex(/^[+]?[\d\s-]{10,15}$/, { message: 'Invalid phone number format' }),
  device_id: z.string().min(10).optional(),
  // SUBJECT_COORDINATOR specific fields (optional, but required for that role)
  subject: z.string().optional(),
  classGroup: z.enum(CLASS_GROUPS).optional(),
}).refine(
  (data) => {
    // Either email+password OR phone must be provided
    const hasEmailLogin = data.email && data.password;
    const hasPhoneLogin = data.phone;
    return hasEmailLogin || hasPhoneLogin;
  },
  { message: 'Either email+password or phone is required for login' }
);


export class LoginDto extends createZodDto(LoginSchema) { }
