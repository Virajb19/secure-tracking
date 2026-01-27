import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';

@Injectable()
export class NoticesService {
    constructor(private readonly db: PrismaService) {}

    /**
     * Get all active notices.
     * Returns notices that are not expired.
     */
    async getNotices(userId: string) {
        // Get user's school if they have a faculty profile
        const faculty = await this.db.faculty.findUnique({
            where: { user_id: userId },
            select: { school_id: true },
        });

        const now = new Date();

        // Build school filter
        const schoolFilter = faculty?.school_id
            ? { OR: [{ school_id: null }, { school_id: faculty.school_id }] }
            : { school_id: null };

        // Get notices - either global (no school_id) or for the user's school
        const notices = await this.db.notice.findMany({
            where: {
                is_active: true,
                AND: [
                    { OR: [{ expires_at: null }, { expires_at: { gte: now } }] },
                    schoolFilter,
                ],
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: [
                { priority: 'asc' }, // HIGH comes before NORMAL, NORMAL before LOW
                { published_at: 'desc' },
            ],
        });

        return notices;
    }

    /**
     * Get a single notice by ID.
     */
    async getNoticeById(noticeId: string) {
        return this.db.notice.findUnique({
            where: { id: noticeId },
        });
    }
}
