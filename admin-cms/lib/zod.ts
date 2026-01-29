import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({message: 'Please enter a valid email'}).trim(),
  password: z.string().min(8, {message: 'Password must be atleast 8 letters long'}).max(15, { message: 'Password cannot exceed 15 characters'}),
  phone: z.string().optional(),
});

export type LoginSchema = z.infer<typeof loginSchema>;

// File validation constants for circulars
const CIRCULAR_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const CIRCULAR_ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];

// Circular file validation
const circularFileValidation = z
  .instanceof(File)
  .optional()
  .refine(
    (file) => !file || file.size <= CIRCULAR_MAX_FILE_SIZE,
    'File size must be less than 10MB'
  )
  .refine(
    (file) => !file || CIRCULAR_ALLOWED_FILE_TYPES.includes(file.type),
    'Only PNG, JPG, or PDF files are allowed'
  );

// Form validation schema for circulars - supports multiple schools
export const circularFormSchema = z.object({
  title: z.string().min(1, 'Circular title is required'),
  description: z.string().optional(),
  issued_by: z.string().min(1, 'Issued by is required'),
  issued_date: z.string().min(1, 'Issued date is required'),
  effective_date: z.string().optional(),
  district_id: z.string().optional(),
  school_ids: z.array(z.string()).optional(), // Multiple schools support
  file: circularFileValidation,
});

export type CircularFormSchema = z.infer<typeof circularFormSchema>;

// Notification types
export const notificationTypes = ['General', 'Paper Setter', 'Paper Checker', 'Invitation', 'Push Notification'] as const;
export type NotificationType = typeof notificationTypes[number];

// File validation for notifications
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];

// Common file validation
const fileValidation = z
  .instanceof(File)
  .optional()
  .refine(
    (file) => !file || file.size <= MAX_FILE_SIZE,
    'File size must be less than 5MB'
  )
  .refine(
    (file) => !file || ALLOWED_FILE_TYPES.includes(file.type),
    'Only PNG, JPG, or PDF files are allowed'
  );

// Base schema for all notification types
const baseNotificationSchema = z.object({
  type: z.enum(notificationTypes),
  file: fileValidation,
});

// General notification schema
export const generalNotificationSchema = baseNotificationSchema.extend({
  type: z.literal('General'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message cannot exceed 1000 characters'),
});

// Paper Setter notification schema
export const paperSetterNotificationSchema = baseNotificationSchema.extend({
  type: z.literal('Paper Setter'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message cannot exceed 1000 characters'),
});

// Paper Checker notification schema
export const paperCheckerNotificationSchema = baseNotificationSchema.extend({
  type: z.literal('Paper Checker'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message cannot exceed 1000 characters'),
});

// Invitation notification schema
export const invitationNotificationSchema = baseNotificationSchema.extend({
  type: z.literal('Invitation'),
  heading: z.string().min(1, 'Heading is required').max(500, 'Heading cannot exceed 500 characters'),
  venue: z.string().min(1, 'Venue is required'),
  eventTime: z.string().min(1, 'Event time is required'),
  eventDate: z.string().min(1, 'Event date is required'),
});

// Push Notification schema
export const pushNotificationSchema = baseNotificationSchema.extend({
  type: z.literal('Push Notification'),
  title: z.string().min(1, 'Title is required').max(100, 'Title cannot exceed 100 characters'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message cannot exceed 1000 characters'),
});

// Union of all notification schemas
export const sendNotificationSchema = z.discriminatedUnion('type', [
  generalNotificationSchema,
  paperSetterNotificationSchema,
  paperCheckerNotificationSchema,
  invitationNotificationSchema,
  pushNotificationSchema,
]);

export type SendNotificationSchema = z.infer<typeof sendNotificationSchema>;
export type GeneralNotificationSchema = z.infer<typeof generalNotificationSchema>;
export type PaperSetterNotificationSchema = z.infer<typeof paperSetterNotificationSchema>;
export type PaperCheckerNotificationSchema = z.infer<typeof paperCheckerNotificationSchema>;
export type InvitationNotificationSchema = z.infer<typeof invitationNotificationSchema>;
export type PushNotificationSchema = z.infer<typeof pushNotificationSchema>;

// Form rejection schema - reason max length 500 characters
export const rejectFormSchema = z.object({
  reason: z.string()
    .min(1, 'Rejection reason is required')
    .max(500, 'Rejection reason cannot exceed 500 characters'),
});