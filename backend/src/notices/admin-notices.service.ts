import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateNoticeDto, UpdateNoticeDto, SendNoticeDto } from './dto/notice.dto';

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Injectable()
export class AdminNoticesService {
    constructor(private readonly db: PrismaService) {}

    /**
     * Get all notices with optional filters.
     */
    async getAllNotices(filters: {
        priority?: string;
        isActive?: boolean;
        schoolId?: string;
    }) {
        const where: any = {};

        if (filters.priority) {
            where.priority = filters.priority;
        }

        if (filters.isActive !== undefined) {
            where.is_active = filters.isActive;
        }

        if (filters.schoolId) {
            where.school_id = filters.schoolId;
        }

        const notices = await this.db.notice.findMany({
            where,
            include: {
                school: {
                    select: {
                        id: true,
                        name: true,
                        district: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: [
                { created_at: 'desc' },
            ],
        });

        return notices;
    }

    /**
     * Get a single notice by ID.
     */
    async getNoticeById(noticeId: string) {
        const notice = await this.db.notice.findUnique({
            where: { id: noticeId },
            include: {
                school: {
                    select: {
                        id: true,
                        name: true,
                        district: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!notice) {
            throw new NotFoundException('Notice not found');
        }

        return notice;
    }

    /**
     * Create a new notice.
     */
    async createNotice(dto: CreateNoticeDto) {
        return this.db.notice.create({
            data: {
                title: dto.title,
                content: dto.content,
                expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
                school_id: dto.school_id || null,
                created_by: dto.created_by || null,
                is_active: true,
            },
            include: {
                school: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }

    /**
     * Update an existing notice.
     */
    async updateNotice(noticeId: string, dto: UpdateNoticeDto) {
        const existing = await this.db.notice.findUnique({
            where: { id: noticeId },
        });

        if (!existing) {
            throw new NotFoundException('Notice not found');
        }

        return this.db.notice.update({
            where: { id: noticeId },
            data: {
                ...(dto.title && { title: dto.title }),
                ...(dto.content && { content: dto.content }),
                ...(dto.priority && { priority: dto.priority }),
                ...(dto.expires_at !== undefined && { 
                    expires_at: dto.expires_at ? new Date(dto.expires_at) : null 
                }),
                ...(dto.is_active !== undefined && { is_active: dto.is_active }),
                ...(dto.school_id !== undefined && { school_id: dto.school_id || null }),
            },
            include: {
                school: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }

    /**
     * Delete a notice.
     */
    async deleteNotice(noticeId: string) {
        const existing = await this.db.notice.findUnique({
            where: { id: noticeId },
        });

        if (!existing) {
            throw new NotFoundException('Notice not found');
        }

        await this.db.notice.delete({
            where: { id: noticeId },
        });

        return { success: true, message: 'Notice deleted successfully' };
    }

    /**
     * Toggle the active status of a notice.
     */
    async toggleActive(noticeId: string) {
        const existing = await this.db.notice.findUnique({
            where: { id: noticeId },
        });

        if (!existing) {
            throw new NotFoundException('Notice not found');
        }

        return this.db.notice.update({
            where: { id: noticeId },
            data: {
                is_active: !existing.is_active,
            },
        });
    }

    /**
     * Send a notice to specific users.
     * Creates a global notice that is visible to all users.
     */
    async sendNotice(dto: SendNoticeDto, createdBy: string) {
        // Validate file size if provided
        if (dto.file_size && dto.file_size > MAX_FILE_SIZE) {
            throw new BadRequestException('File size must be less than 5MB');
        }

        // Verify that all user IDs exist
        const users = await this.db.user.findMany({
            where: { id: { in: dto.user_ids } },
            select: { id: true },
        });

        if (users.length !== dto.user_ids.length) {
            throw new BadRequestException('One or more user IDs are invalid');
        }

        // Create a global notice (no school_id means it's visible to everyone)
        const notice = await this.db.notice.create({
            data: {
                title: dto.title,
                content: dto.message,
                type: dto.type || 'General',
                subject: dto.subject,
                venue: dto.venue,
                event_time: dto.event_time,
                event_date: dto.event_date ? new Date(dto.event_date) : null,
                is_active: true,
                created_by: createdBy,
                file_url: dto.file_url,
                file_name: dto.file_name,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return {
            success: true,
            message: `Notice sent to ${dto.user_ids.length} users`,
            notice,
            details: {
                total: dto.user_ids.length,
                success: dto.user_ids.length,
                failed: 0,
            },
        };
    }
}
