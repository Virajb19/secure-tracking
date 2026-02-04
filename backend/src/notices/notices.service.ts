import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { NoticeType, SelectionStatus } from '@prisma/client';
import { NotificationsService, NotificationType as NotifType } from '../notifications/notifications.service';

@Injectable()
export class NoticesService {
    constructor(
        private readonly db: PrismaService,
        private readonly notifications: NotificationsService,
    ) {}

    /**
     * Get all active notices.
     * Returns notices that are not expired.
     * For Paper Setter/Checker notices, includes acceptance status.
     * 
     * SECURITY: Targeted notices (is_targeted=true) are only visible to their recipients.
     * Global notices (is_targeted=false) are visible to all users in the school/globally.
     */
    async getNotices(userId: string) {
        // Get user's school if they have a faculty profile
        const faculty = await this.db.faculty.findUnique({
            where: { user_id: userId },
            select: { school_id: true },
        });

        const now = new Date();

        // Build school filter for global notices
        const schoolFilter = faculty?.school_id
            ? { OR: [{ school_id: null }, { school_id: faculty.school_id }] }
            : { school_id: null };

        // Get notices with proper security filtering:
        // 1. Global notices (is_targeted=false): visible to all in school
        // 2. Targeted notices (is_targeted=true): only visible to recipients
        const notices = await this.db.notice.findMany({
            where: {
                is_active: true,
                AND: [
                    { OR: [{ expires_at: null }, { expires_at: { gte: now } }] },
                    {
                        OR: [
                            // Global notices - follow school filter
                            {
                                is_targeted: false,
                                ...schoolFilter,
                            },
                            // Targeted notices - only if user is a recipient
                            {
                                is_targeted: true,
                                recipients: {
                                    some: { user_id: userId },
                                },
                            },
                        ],
                    },
                ],
            },
            select: {
                id: true,
                title: true,
                content: true,
                type: true,
                subject: true,
                venue: true,
                event_time: true,
                event_date: true,
                published_at: true,
                created_at: true,
                file_url: true,
                file_name: true,
                is_targeted: true,
                creator: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                // Include read status for targeted notices
                recipients: {
                    where: { user_id: userId },
                    select: { is_read: true, read_at: true },
                },
            },
            orderBy: [
                { published_at: 'desc' },
            ],
        });

        // For Paper Setter/Checker notices, get acceptance status
        const noticesWithStatus = await Promise.all(
            notices.map(async (notice) => {
                // Flatten recipient info
                const recipientInfo = notice.recipients[0];
                const baseNotice = {
                    ...notice,
                    is_read: recipientInfo?.is_read ?? false,
                    recipients: undefined, // Remove recipients array from response
                };

                if (notice.type === NoticeType.PAPER_SETTER || notice.type === NoticeType.PAPER_CHECKER) {
                    const selectionType = notice.type === NoticeType.PAPER_SETTER ? 'PAPER_SETTER' : 'EXAMINER';
                    
                    // Find the corresponding selection for this user
                    const selection = await this.db.paperSetterSelection.findFirst({
                        where: {
                            teacher_id: userId,
                            subject: notice.subject || undefined,
                            selection_type: selectionType,
                        },
                        select: {
                            status: true,
                        },
                    });

                    return {
                        ...baseNotice,
                        acceptance_status: selection?.status === SelectionStatus.ACCEPTED ? 'ACCEPTED' : 'PENDING',
                    };
                }
                return baseNotice;
            })
        );

        return noticesWithStatus;
    }

    /**
     * Get a single notice by ID.
     */
    async getNoticeById(noticeId: string) {
        return this.db.notice.findUnique({
            where: { id: noticeId },
        });
    }

    /**
     * Accept a Paper Setter/Checker notice.
     * - Validates the notice is Paper Setter or Paper Checker type
     * - Checks if teacher has bank details on file
     * - Updates the PaperSetterSelection status to ACCEPTED
     * - Notifies the admin/coordinator
     */
    async acceptNotice(noticeId: string, teacherId: string) {
        // Get the notice
        const notice = await this.db.notice.findUnique({
            where: { id: noticeId },
            include: {
                creator: { select: { id: true, name: true } },
            },
        });

        if (!notice) {
            throw new NotFoundException('Notice not found');
        }

        // Validate notice type is Paper Setter or Paper Checker
        if (notice.type !== NoticeType.PAPER_SETTER && notice.type !== NoticeType.PAPER_CHECKER) {
            throw new BadRequestException('This notice type cannot be accepted');
        }

        // Check if teacher has bank details
        const hasBankDetails = await this.db.bankDetails.findUnique({
            where: { user_id: teacherId },
        });

        if (!hasBankDetails) {
            throw new BadRequestException(
                'You must submit your bank details before accepting this notice. Bank details are required for payment processing.'
            );
        }

        // Find the corresponding PaperSetterSelection for this teacher
        // Match by teacher_id and selection_type, and optionally by subject
        const selectionType = notice.type === NoticeType.PAPER_SETTER ? 'PAPER_SETTER' : 'EXAMINER';
        
        // First try to find by exact subject match
        let selection = await this.db.paperSetterSelection.findFirst({
            where: {
                teacher_id: teacherId,
                subject: notice.subject || undefined,
                selection_type: selectionType,
                status: SelectionStatus.INVITED,
            },
            include: {
                coordinator: { select: { id: true, name: true } },
            },
        });

        // If not found by subject, try to find any pending selection of this type
        if (!selection) {
            selection = await this.db.paperSetterSelection.findFirst({
                where: {
                    teacher_id: teacherId,
                    selection_type: selectionType,
                    status: SelectionStatus.INVITED,
                },
                include: {
                    coordinator: { select: { id: true, name: true } },
                },
            });
        }

        // If still not found, try any pending selection for this teacher
        if (!selection) {
            selection = await this.db.paperSetterSelection.findFirst({
                where: {
                    teacher_id: teacherId,
                    status: SelectionStatus.INVITED,
                },
                include: {
                    coordinator: { select: { id: true, name: true } },
                },
            });
        }

        if (!selection) {
            throw new NotFoundException('No pending invitation found for this notice');
        }

        // Update selection status to ACCEPTED
        const updated = await this.db.paperSetterSelection.update({
            where: { id: selection.id },
            data: {
                status: SelectionStatus.ACCEPTED,
                accepted_at: new Date(),
            },
        });

        // Get teacher name for notification
        const teacher = await this.db.user.findUnique({
            where: { id: teacherId },
            select: { name: true },
        });

        // Notify coordinator/admin
        if (selection.coordinator_id) {
            await this.notifications.sendToUser({
                userId: selection.coordinator_id,
                title: 'Selection Accepted',
                body: `${teacher?.name || 'Teacher'} has accepted the ${selection.selection_type === 'PAPER_SETTER' ? 'Paper Setter' : 'Paper Checker'} invitation for ${selection.subject} Class ${selection.class_level}.`,
                type: NotifType.PAPER_SETTER_ACCEPTED,
            });
        }

        return {
            success: true,
            message: 'Notice accepted successfully',
            selection: updated,
        };
    }

    /**
     * Mark a targeted notice as read.
     */
    async markNoticeAsRead(noticeId: string, userId: string) {
        const recipient = await this.db.noticeRecipient.findUnique({
            where: {
                notice_id_user_id: {
                    notice_id: noticeId,
                    user_id: userId,
                },
            },
        });

        if (!recipient) {
            throw new ForbiddenException('You do not have access to this notice');
        }

        if (!recipient.is_read) {
            await this.db.noticeRecipient.update({
                where: { id: recipient.id },
                data: {
                    is_read: true,
                    read_at: new Date(),
                },
            });
        }

        return { success: true };
    }
}
