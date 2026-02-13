import { z } from "zod";

// Valid class groups for SUBJECT_COORDINATOR
export const CLASS_GROUPS = ['8-10', '11-12'] as const;
export type ClassGroup = typeof CLASS_GROUPS[number];

// Predefined subjects list
export const SUBJECTS = [
  'Assamese',
  'English',
  'Hindi',
  'Mathematics',
  'General Science',
  'Social Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Economics',
  'Political Science',
  'History',
  'Geography',
  'Sanskrit',
  'Bengali',
  'Bodo',
  'Nepali',
  'Manipuri',
] as const;

export const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email' }).trim(),
  password: z.string().min(8, { message: 'Password must be atleast 8 letters long' }).max(15, { message: 'Password cannot exceed 15 characters' }),
  phone: z.string().min(1, { message: "Phone number is required" }).regex(/^[+]?[\d\s-]{10,15}$/, { message: 'Invalid phone number format' }),
  // SUBJECT_COORDINATOR specific fields (optional)
  subject: z.string().optional(),
  classGroup: z.enum(CLASS_GROUPS).optional(),
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
  classLevel: z.number().min(1, 'Class level is required').max(12, 'Class level cannot exceed 12'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message cannot exceed 1000 characters'),
});

// Paper Checker notification schema
export const paperCheckerNotificationSchema = baseNotificationSchema.extend({
  type: z.literal('Paper Checker'),
  subject: z.string().min(1, 'Subject is required'),
  classLevel: z.number().min(1, 'Class level is required').max(12, 'Class level cannot exceed 12'),
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

// ============================
// CREATE TASK SCHEMA
// ============================
export const createTaskSchema = z.object({
  sealed_pack_code: z
    .string()
    .min(1, 'Sealed pack code is required')
    .max(50, 'Pack code cannot exceed 50 characters'),
  source_location: z
    .string()
    .min(1, 'Source location is required')
    .max(500, 'Source location cannot exceed 500 characters'),
  destination_location: z
    .string()
    .min(1, 'Destination location is required')
    .max(500, 'Destination location cannot exceed 500 characters'),
  assigned_user_id: z.string().uuid('Please select a valid user'),
  exam_type: z.enum(['REGULAR', 'COMPARTMENTAL'], {
    message: 'Exam type is required',
  }),
  start_time: z
    .string()
    .min(1, 'Start time is required'),
  end_time: z
    .string()
    .min(1, 'End time is required'),
  geofence_radius: z
    .string()
    .refine((val) => {
      if (!val) return true; // Allow empty, will use default
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 10 && num <= 1000;
    }, 'Geofence radius must be between 10m and 1000m'),
}).refine(
  (data) => {
    const start = new Date(data.start_time);
    const end = new Date(data.end_time);
    return end > start;
  },
  {
    message: 'End time must be after start time',
    path: ['end_time'],
  }
);

export type CreateTaskSchema = z.infer<typeof createTaskSchema>;

// ============================
// REASSIGN SUPERINTENDENT SCHEMA
// ============================
export const reassignSuperintendentSchema = z.object({
  email: z.
    email({ message: 'Please enter a valid email address' })
    .refine(val => val.length > 0, {
      message: 'Email is required',
    }),
});

export type ReassignSuperintendentSchema = z.infer<typeof reassignSuperintendentSchema>;

// ============================
// EXAM SCHEDULER SCHEMAS
// ============================

export const EXAM_CLASSES = ['CLASS_10', 'CLASS_12'] as const;
export type ExamClassValue = typeof EXAM_CLASSES[number];

export const SUBJECT_CATEGORIES = ['CORE', 'VOCATIONAL'] as const;
export type SubjectCategoryValue = typeof SUBJECT_CATEGORIES[number];

export const createExamScheduleSchema = z.object({
  exam_date: z
    .string()
    .min(1, 'Exam date is required'),
  class: z.enum(EXAM_CLASSES, { message: 'Class is required' }),
  subject: z.string().min(1, 'Subject is required'),
  subject_category: z.enum(SUBJECT_CATEGORIES, { message: 'Subject category is required' }),
  exam_center_id: z
    .string()
    .min(1, 'Exam center is required'),
});

export type CreateExamScheduleSchema = z.infer<typeof createExamScheduleSchema>;

export const editExamScheduleSchema = z.object({
  exam_date: z
    .string()
    .min(1, 'Exam date is required'),
  class: z.enum(EXAM_CLASSES, { message: 'Class is required' }),
  subject: z.string().min(1, 'Subject is required'),
  subject_category: z.enum(SUBJECT_CATEGORIES, { message: 'Subject category is required' }),
  exam_center_id: z
    .string()
    .min(1, 'Exam center is required'),
  exam_start_time: z
    .string()
    .min(1, 'Start time is required')
    .refine(
      (val) => /^\d{2}:\d{2}$/.test(val),
      'Start time must be in HH:MM format'
    ),
  exam_end_time: z
    .string()
    .min(1, 'End time is required')
    .refine(
      (val) => /^\d{2}:\d{2}$/.test(val),
      'End time must be in HH:MM format'
    ),
}).refine(
  (data) => {
    if (!data.exam_start_time || !data.exam_end_time) return true;
    return data.exam_end_time > data.exam_start_time;
  },
  {
    message: 'End time must be after start time',
    path: ['exam_end_time'],
  }
);

export type EditExamScheduleSchema = z.infer<typeof editExamScheduleSchema>;

export const bulkExamScheduleSchema = z.object({
  schedules: z
    .array(createExamScheduleSchema)
    .min(1, 'At least one exam schedule is required'),
});

export type BulkExamScheduleSchema = z.infer<typeof bulkExamScheduleSchema>;

// ============================
// MANAGE PAGE SCHEMAS
// ============================

export const createSchoolSchema = z.object({
  name: z.string().min(1, 'School name is required').max(255),
  registration_code: z.string().min(4, 'Min 4 characters').max(50),
  district_id: z.string().min(1, 'District is required'),
});

export type CreateSchoolFormValues = z.infer<typeof createSchoolSchema>;

export const createSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(150),
  class_levels: z.array(z.number()).min(1, 'Select at least one class'),
});

export type CreateSubjectFormValues = z.infer<typeof createSubjectSchema>;

export const editSchoolSchema = createSchoolSchema.partial();

export type EditSchoolFormValues = z.infer<typeof editSchoolSchema>;

export const editSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(150),
  class_level: z.number().int().min(1).max(12),
  is_active: z.boolean(),
});

export type EditSubjectFormValues = z.infer<typeof editSubjectSchema>;
