import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { FormSubmission, FormSubmissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';

/**
 * Form Submissions Service
 * 
 * Handles the form approval workflow for Form 6:
 * 1. User submits form
 * 2. Admin reviews and approves/rejects with remarks
 * 3. User gets notified of status change
 * 
 * WORKFLOW:
 * - DRAFT: Form saved but not submitted
 * - SUBMITTED: Pending admin review
 * - APPROVED: Admin approved the form
 * - REJECTED: Admin rejected with remarks
 */
@Injectable()
export class FormSubmissionsService {
    constructor(
        private readonly db: PrismaService,
        private readonly notificationsService: NotificationsService,
    ) {}

    /**
     * Create a new form submission (DRAFT or SUBMITTED)
     */
    async create(
        schoolId: string,
        submittedBy: string,
        formType: string,
        status: FormSubmissionStatus = FormSubmissionStatus.DRAFT,
    ): Promise<FormSubmission> {
        // Check if submission already exists for this school and form type
        const existing = await this.db.formSubmission.findUnique({
            where: {
                school_id_form_type: {
                    school_id: schoolId,
                    form_type: formType,
                },
            },
        });

        if (existing) {
            throw new BadRequestException(`Form ${formType} already exists for this school`);
        }

        return this.db.formSubmission.create({
            data: {
                school_id: schoolId,
                submitted_by: submittedBy,
                form_type: formType,
                status,
                submitted_at: status === FormSubmissionStatus.SUBMITTED ? new Date() : null,
            },
        });
    }

    /**
     * Submit a draft form for approval
     */
    async submit(
        formId: string,
        userId: string,
    ): Promise<FormSubmission> {
        const form = await this.findById(formId);

        if (form.submitted_by !== userId) {
            throw new ForbiddenException('You can only submit your own forms');
        }

        if (form.status !== FormSubmissionStatus.DRAFT) {
            throw new BadRequestException('Only draft forms can be submitted');
        }

        return this.db.formSubmission.update({
            where: { id: formId },
            data: {
                status: FormSubmissionStatus.SUBMITTED,
                submitted_at: new Date(),
            },
        });
    }

    /**
     * Admin approves a form submission
     */
    async approve(
        formId: string,
        adminId: string,
    ): Promise<FormSubmission> {
        const form = await this.findById(formId);

        if (form.status !== FormSubmissionStatus.SUBMITTED) {
            throw new BadRequestException('Only submitted forms can be approved');
        }

        const updatedForm = await this.db.formSubmission.update({
            where: { id: formId },
            data: {
                status: FormSubmissionStatus.APPROVED,
                approved_by: adminId,
                approved_at: new Date(),
            },
        });

        // Send notification to submitter
        try {
            await this.notificationsService.sendToUser({
                userId: form.submitted_by,
                title: 'Form Approved',
                body: `Your ${form.form_type} form has been approved.`,
                type: NotificationType.FORM_APPROVAL,
            });
        } catch (error) {
            console.error('Failed to send notification:', error);
        }

        return updatedForm;
    }

    /**
     * Admin rejects a form submission with remarks
     */
    async reject(
        formId: string,
        adminId: string,
        reason: string,
    ): Promise<FormSubmission> {
        const form = await this.findById(formId);

        if (form.status !== FormSubmissionStatus.SUBMITTED) {
            throw new BadRequestException('Only submitted forms can be rejected');
        }

        if (!reason || reason.trim() === '') {
            throw new BadRequestException('Rejection reason is required');
        }

        const updatedForm = await this.db.formSubmission.update({
            where: { id: formId },
            data: {
                status: FormSubmissionStatus.REJECTED,
                rejection_reason: reason,
                approved_by: adminId, // Using same field to track who reviewed
                approved_at: new Date(),
            },
        });

        // Send notification to submitter
        try {
            await this.notificationsService.sendToUser({
                userId: form.submitted_by,
                title: 'Form Requires Revision',
                body: `Your ${form.form_type} form needs changes. Reason: ${reason}`,
                type: NotificationType.FORM_REJECTION,
            });
        } catch (error) {
            console.error('Failed to send notification:', error);
        }

        return updatedForm;
    }

    /**
     * Get form by ID
     */
    async findById(formId: string): Promise<FormSubmission> {
        const form = await this.db.formSubmission.findUnique({
            where: { id: formId },
        });

        if (!form) {
            throw new NotFoundException('Form submission not found');
        }

        return form;
    }

    /**
     * Get forms by school
     */
    async findBySchool(schoolId: string): Promise<FormSubmission[]> {
        return this.db.formSubmission.findMany({
            where: { school_id: schoolId },
            orderBy: { created_at: 'desc' },
        });
    }

    /**
     * Get user's form submissions
     */
    async findByUser(
        userId: string,
        status?: FormSubmissionStatus,
    ): Promise<FormSubmission[]> {
        return this.db.formSubmission.findMany({
            where: {
                submitted_by: userId,
                ...(status && { status }),
            },
            orderBy: { created_at: 'desc' },
        });
    }

    /**
     * Get all pending form submissions (for admin)
     */
    async findPending(
        formType?: string,
        page: number = 1,
        limit: number = 20,
    ): Promise<{ data: FormSubmission[]; total: number }> {
        const skip = (page - 1) * limit;

        const where = {
            status: FormSubmissionStatus.SUBMITTED,
            ...(formType && { form_type: formType }),
        };

        const [data, total] = await Promise.all([
            this.db.formSubmission.findMany({
                where,
                skip,
                take: limit,
                orderBy: { submitted_at: 'asc' }, // FIFO order
            }),
            this.db.formSubmission.count({ where }),
        ]);

        return { data, total };
    }

    /**
     * Update a rejected form and resubmit
     */
    async resubmit(
        formId: string,
        userId: string,
    ): Promise<FormSubmission> {
        const form = await this.findById(formId);

        if (form.submitted_by !== userId) {
            throw new ForbiddenException('You can only resubmit your own forms');
        }

        if (form.status !== FormSubmissionStatus.REJECTED) {
            throw new BadRequestException('Only rejected forms can be resubmitted');
        }

        return this.db.formSubmission.update({
            where: { id: formId },
            data: {
                status: FormSubmissionStatus.SUBMITTED,
                submitted_at: new Date(),
                rejection_reason: null, // Clear previous reason
            },
        });
    }

    /**
     * Get form by school and type
     */
    async findBySchoolAndType(
        schoolId: string,
        formType: string,
    ): Promise<FormSubmission | null> {
        return this.db.formSubmission.findUnique({
            where: {
                school_id_form_type: {
                    school_id: schoolId,
                    form_type: formType,
                },
            },
        });
    }

    /**
     * Delete a draft form
     */
    async deleteDraft(
        formId: string,
        userId: string,
    ): Promise<void> {
        const form = await this.findById(formId);

        if (form.submitted_by !== userId) {
            throw new ForbiddenException('You can only delete your own forms');
        }

        if (form.status !== FormSubmissionStatus.DRAFT) {
            throw new BadRequestException('Only draft forms can be deleted');
        }

        await this.db.formSubmission.delete({
            where: { id: formId },
        });
    }
}
