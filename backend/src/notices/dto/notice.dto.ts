import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { NoticeType } from '@prisma/client';

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Notice types for categorization
const noticeTypeEnum = z.enum([
  NoticeType.GENERAL,
  NoticeType.PAPER_SETTER,
  NoticeType.PAPER_CHECKER,
  NoticeType.INVITATION,
  NoticeType.PUSH_NOTIFICATION,
]);


// Schema for creating a notice
const CreateNoticeSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    content: z.string().min(1, 'Content is required'),
    priority: z.enum(['HIGH', 'NORMAL', 'LOW']).optional().default('NORMAL'),
    type: noticeTypeEnum.optional().default(NoticeType.GENERAL),
    subject: z.string().optional(),  // For Paper Setter/Checker
    venue: z.string().optional(),     // For Invitation
    event_time: z.string().optional(), // For Invitation
    event_date: z.string().optional(), // For Invitation
    expires_at: z.string().optional(),
    school_id: z.uuid('Invalid school ID').optional(),
    created_by: z.uuid('Invalid creator ID').optional(),
    file_url: z.string().optional(),
    file_name: z.string().optional(),
});

// Schema for updating a notice
const UpdateNoticeSchema = z.object({
    title: z.string().min(1, 'Title is required').optional(),
    content: z.string().min(1, 'Content is required').optional(),
    priority: z.enum(['HIGH', 'NORMAL', 'LOW']).optional(),
    type: noticeTypeEnum.optional(),
    subject: z.string().optional(),
    venue: z.string().optional(),
    event_time: z.string().optional(),
    event_date: z.string().optional(),
    expires_at: z.string().optional(),
    is_active: z.boolean().optional(),
    school_id: z.uuid('Invalid school ID').optional(),
    file_url: z.string().optional(),
    file_name: z.string().optional(),
});

// Schema for sending a notice to specific users (broadcast notice)
const SendNoticeSchema = z.object({
    user_ids: z.array(z.uuid('Invalid user ID')).min(1, 'At least one user ID is required'),
    title: z.string().min(1, 'Title is required'),
    message: z.string().min(1, 'Message is required').max(1000, 'Message cannot exceed 1000 characters'),
    type: noticeTypeEnum.optional().default(NoticeType.GENERAL),
    subject: z.string().optional(),  // For Paper Setter/Checker
    class_level: z.number().min(1).max(12).optional(),  // For Paper Setter/Checker (e.g., 10, 12)
    venue: z.string().optional(),     // For Invitation
    event_time: z.string().optional(), // For Invitation
    event_date: z.string().optional(), // For Invitation
    file_url: z.string().optional(),
    file_name: z.string().optional(),
    file_size: z.number().max(MAX_FILE_SIZE, 'File size must be less than 5MB').optional(),
});

export class CreateNoticeDto extends createZodDto(CreateNoticeSchema) {}

export class UpdateNoticeDto extends createZodDto(UpdateNoticeSchema) {}

export class SendNoticeDto extends createZodDto(SendNoticeSchema) {}
