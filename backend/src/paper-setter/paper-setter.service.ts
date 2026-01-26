import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { UserRole, SelectionStatus } from '@prisma/client';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';

/**
 * Paper Setter Selection Service
 * 
 * Handles confidential selection of teachers as Paper Setters or Examiners.
 * 
 * CRITICAL BUSINESS RULES:
 * 1. Exclusive Selection: Once a teacher is selected for a subject, they are HIDDEN from all other coordinators
 * 2. School Warning: If a teacher from a school is already selected, show warning (not names)
 * 3. No Reject: Teachers can only Accept (no reject option for paper setter invites)
 * 4. Bank Details: Required on acceptance for payment processing
 */
@Injectable()
export class PaperSetterService {
    constructor(
        private readonly db: PrismaService,
        private readonly notifications: NotificationsService,
    ) {}

    /**
     * Search teachers for paper setter selection
     * EXCLUSIVE LOGIC: Hide teachers already selected for ANY subject
     */
    async searchTeachers(
        coordinatorId: string,
        subject: string,
        classLevel: number,
        filters?: {
            districtId?: string;
            schoolId?: string;
            search?: string;
        },
    ) {
        // Get coordinator info to verify role
        const coordinator = await this.db.user.findUnique({
            where: { id: coordinatorId },
            select: { role: true, coordinator_subject: true, coordinator_class: true },
        });

        if (!coordinator || coordinator.role !== UserRole.SUBJECT_COORDINATOR) {
            throw new ForbiddenException('Only Subject Coordinators can search for paper setters');
        }

        // Get all teacher IDs already selected for ANY subject (EXCLUSIVE LOGIC)
        const selectedTeacherIds = await this.db.paperSetterSelection.findMany({
            select: { teacher_id: true },
        });
        const excludeIds = selectedTeacherIds.map(s => s.teacher_id);

        // Build search query
        const whereClause: any = {
            role: UserRole.TEACHER,
            is_active: true,
            id: { notIn: excludeIds },
            faculty: {
                approval_status: 'APPROVED',
                teaching_assignments: {
                    some: {
                        subject: subject,
                        class_level: classLevel,
                    },
                },
            },
        };

        // Apply district filter
        if (filters?.districtId) {
            whereClause.faculty.school = {
                district_id: filters.districtId,
            };
        }

        // Apply school filter
        if (filters?.schoolId) {
            whereClause.faculty = {
                ...whereClause.faculty,
                school_id: filters.schoolId,
            };
        }

        // Apply name search
        if (filters?.search) {
            whereClause.name = {
                contains: filters.search,
                mode: 'insensitive',
            };
        }

        const teachers = await this.db.user.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                phone: true,
                faculty: {
                    select: {
                        designation: true,
                        years_of_experience: true,
                        school: {
                            select: {
                                id: true,
                                name: true,
                                district: {
                                    select: { id: true, name: true },
                                },
                            },
                        },
                        teaching_assignments: {
                            where: {
                                subject: subject,
                                class_level: classLevel,
                            },
                        },
                    },
                },
            },
            take: 50,
        });

        // Add school warning for each teacher
        const teachersWithWarning = await Promise.all(
            teachers.map(async (teacher) => {
                const schoolId = teacher.faculty?.school?.id;
                if (!schoolId) return { ...teacher, schoolWarning: false };

                // Check if any teacher from same school is already selected
                const existingFromSchool = await this.db.paperSetterSelection.findFirst({
                    where: {
                        teacher: {
                            faculty: {
                                school_id: schoolId,
                            },
                        },
                    },
                });

                return {
                    ...teacher,
                    schoolWarning: !!existingFromSchool,
                };
            }),
        );

        return teachersWithWarning;
    }

    /**
     * Select a teacher as Paper Setter or Examiner
     */
    async selectTeacher(
        coordinatorId: string,
        teacherId: string,
        data: {
            subject: string;
            classLevel: number;
            selectionType: 'PAPER_SETTER' | 'EXAMINER';
            invitationMessage?: string;
            officialOrderUrl?: string;
        },
    ) {
        // Verify coordinator
        const coordinator = await this.db.user.findUnique({
            where: { id: coordinatorId },
            select: { role: true, name: true },
        });

        if (!coordinator || coordinator.role !== UserRole.SUBJECT_COORDINATOR) {
            throw new ForbiddenException('Only Subject Coordinators can select paper setters');
        }

        // Check if teacher is already selected for ANY subject (EXCLUSIVE)
        const existingSelection = await this.db.paperSetterSelection.findFirst({
            where: { teacher_id: teacherId },
        });

        if (existingSelection) {
            throw new BadRequestException('This teacher is already selected for another subject');
        }

        // Verify teacher exists and is approved
        const teacher = await this.db.user.findUnique({
            where: { id: teacherId },
            include: {
                faculty: {
                    include: {
                        school: true,
                    },
                },
            },
        });

        if (!teacher || teacher.role !== UserRole.TEACHER) {
            throw new NotFoundException('Teacher not found');
        }

        if (teacher.faculty?.approval_status !== 'APPROVED') {
            throw new BadRequestException('Teacher profile is not approved');
        }

        // Create selection
        const selection = await this.db.paperSetterSelection.create({
            data: {
                teacher_id: teacherId,
                coordinator_id: coordinatorId,
                subject: data.subject,
                class_level: data.classLevel,
                selection_type: data.selectionType,
                invitation_message: data.invitationMessage,
                official_order_url: data.officialOrderUrl,
                status: SelectionStatus.INVITED,
            },
        });

        // Send notification to teacher
        const typeLabel = data.selectionType === 'PAPER_SETTER' ? 'Paper Setter' : 'Examiner';
        await this.notifications.sendToUser({
            userId: teacherId,
            title: `${typeLabel} Selection`,
            body: `You have been selected as ${typeLabel} for ${data.subject} Class ${data.classLevel}. Please accept to proceed.`,
            type: NotificationType.PAPER_SETTER_INVITE,
            data: { selectionId: selection.id },
        });

        return selection;
    }

    /**
     * Get all selections made by a coordinator
     */
    async getCoordinatorSelections(coordinatorId: string) {
        return this.db.paperSetterSelection.findMany({
            where: { coordinator_id: coordinatorId },
            include: {
                teacher: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        faculty: {
                            select: {
                                school: {
                                    select: { name: true },
                                },
                            },
                        },
                        bank_details: true,
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });
    }

    /**
     * Get pending invitations for a teacher
     */
    async getTeacherInvitations(teacherId: string) {
        return this.db.paperSetterSelection.findMany({
            where: {
                teacher_id: teacherId,
                status: SelectionStatus.INVITED,
            },
            include: {
                coordinator: {
                    select: { name: true },
                },
            },
            orderBy: { created_at: 'desc' },
        });
    }

    /**
     * Accept paper setter invitation (NO REJECT OPTION)
     */
    async acceptInvitation(teacherId: string, selectionId: string) {
        const selection = await this.db.paperSetterSelection.findUnique({
            where: { id: selectionId },
            include: {
                coordinator: { select: { name: true } },
            },
        });

        if (!selection) {
            throw new NotFoundException('Selection not found');
        }

        if (selection.teacher_id !== teacherId) {
            throw new ForbiddenException('This invitation is not for you');
        }

        if (selection.status === SelectionStatus.ACCEPTED) {
            throw new BadRequestException('Already accepted');
        }

        // Update status
        const updated = await this.db.paperSetterSelection.update({
            where: { id: selectionId },
            data: {
                status: SelectionStatus.ACCEPTED,
                accepted_at: new Date(),
            },
        });

        // Notify coordinator
        await this.notifications.sendToUser({
            userId: selection.coordinator_id,
            title: 'Selection Accepted',
            body: `Teacher has accepted the ${selection.selection_type} invitation for ${selection.subject} Class ${selection.class_level}.`,
            type: NotificationType.PAPER_SETTER_ACCEPTED,
        });

        return updated;
    }

    /**
     * Upload official order PDF
     */
    async uploadOfficialOrder(coordinatorId: string, selectionId: string, fileUrl: string) {
        const selection = await this.db.paperSetterSelection.findUnique({
            where: { id: selectionId },
        });

        if (!selection) {
            throw new NotFoundException('Selection not found');
        }

        if (selection.coordinator_id !== coordinatorId) {
            throw new ForbiddenException('Not your selection');
        }

        return this.db.paperSetterSelection.update({
            where: { id: selectionId },
            data: { official_order_url: fileUrl },
        });
    }

    /**
     * Get school warning count (how many teachers from a school are selected)
     */
    async getSchoolSelectionCount(schoolId: string) {
        const count = await this.db.paperSetterSelection.count({
            where: {
                teacher: {
                    faculty: {
                        school_id: schoolId,
                    },
                },
            },
        });

        return { school_id: schoolId, selected_count: count };
    }

    /**
     * Get all selections (Admin view)
     */
    async getAllSelections(filters?: {
        subject?: string;
        classLevel?: number;
        status?: SelectionStatus;
    }) {
        const where: any = {};

        if (filters?.subject) where.subject = filters.subject;
        if (filters?.classLevel) where.class_level = filters.classLevel;
        if (filters?.status) where.status = filters.status;

        return this.db.paperSetterSelection.findMany({
            where,
            include: {
                teacher: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        faculty: {
                            select: {
                                school: {
                                    select: { name: true, district: { select: { name: true } } },
                                },
                            },
                        },
                        bank_details: true,
                    },
                },
                coordinator: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { created_at: 'desc' },
        });
    }

    /**
     * Delete a selection (Admin only)
     */
    async deleteSelection(selectionId: string) {
        return this.db.paperSetterSelection.delete({
            where: { id: selectionId },
        });
    }
}
