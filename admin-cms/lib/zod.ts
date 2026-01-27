import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({message: 'Please enter a valid email'}).trim(),
  password: z.string().min(8, {message: 'Password must be atleast 8 letters long'}).max(15, { message: 'Password cannot exceed 15 characters'}),
  phone: z.string().optional(),
});

export type LoginSchema = z.infer<typeof loginSchema>;

// Form validation schema for circulars - supports multiple schools
export const circularFormSchema = z.object({
  title: z.string().min(1, 'Circular title is required'),
  description: z.string().optional(),
  issued_by: z.string().min(1, 'Issued by is required'),
  issued_date: z.string().min(1, 'Issued date is required'),
  effective_date: z.string().optional(),
  district_id: z.string().optional(),
  school_ids: z.array(z.string()).optional(), // Multiple schools support
});

export type CircularFormSchema = z.infer<typeof circularFormSchema>;

// Notification types
export const notificationTypes = ['General', 'Paper Setter', 'Paper Checker', 'Invitation', 'Push Notification'] as const;
export type NotificationType = typeof notificationTypes[number];

// File validation for notifications
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];

// Form validation schema for send notification dialog
export const sendNotificationSchema = z.object({
  type: z.enum(notificationTypes).refine((val) => notificationTypes.includes(val), 'Please select a notification type'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message cannot exceed 1000 characters'),
  file: z
    .instanceof(File)
    .optional()
    .refine(
      (file) => !file || file.size <= MAX_FILE_SIZE,
      'File size must be less than 5MB'
    )
    .refine(
      (file) => !file || ALLOWED_FILE_TYPES.includes(file.type),
      'Only PNG, JPG, or PDF files are allowed'
    ),
});

export type SendNotificationSchema = z.infer<typeof sendNotificationSchema>;