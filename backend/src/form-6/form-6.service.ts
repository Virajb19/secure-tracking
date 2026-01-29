import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole, ApprovalStatus } from '@prisma/client';
import { PrismaService } from '../prisma';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class Form6Service {
    constructor(
        private readonly db: PrismaService,
        private readonly auditLogsService: AuditLogsService,
        private readonly notificationsService: NotificationsService,
    ) {}

    // ===========================
    // ADMIN ENDPOINTS
    // ===========================

    /**
     * Get Form 6A details for a school (Admin only).
     * Returns teaching staff for Pre-Primary to Class 10.
     */
    async getForm6ABySchool(schoolId: string) {
        const school = await this.db.school.findUnique({
            where: { id: schoolId },
            include: { district: true },
        });

        if (!school) {
            throw new NotFoundException('School not found');
        }

        const staffList = await this.db.faculty.findMany({
            where: {
                school_id: schoolId,
                faculty_type: 'TEACHING',
                teaching_assignments: {
                    some: {
                        class_level: { lte: 10 },
                    },
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        profile_image_url: true,
                    },
                },
                teaching_assignments: {
                    where: {
                        class_level: { lte: 10 },
                    },
                },
            },
        });

        return {
            school,
            staff: staffList,
        };
    }

    /**
     * Get Form 6B details for a school (Admin only).
     * Returns non-teaching staff.
     */
    async getForm6BBySchool(schoolId: string) {
        const school = await this.db.school.findUnique({
            where: { id: schoolId },
            include: { district: true },
        });

        if (!school) {
            throw new NotFoundException('School not found');
        }

        const staffList = await this.db.nonTeachingStaff.findMany({
            where: { school_id: schoolId },
        });

        return {
            school,
            staff: staffList,
        };
    }

    /**
     * Get Form 6C Lower details for a school (Admin only).
     * Returns student strength for classes <= 10.
     */
    async getForm6CLowerBySchool(schoolId: string) {
        const school = await this.db.school.findUnique({
            where: { id: schoolId },
            include: { district: true },
        });

        if (!school) {
            throw new NotFoundException('School not found');
        }

        const strengths = await this.db.studentStrength.findMany({
            where: {
                school_id: schoolId,
                class_level: { lte: 10 },
            },
            orderBy: { class_level: 'asc' },
        });

        return {
            school,
            strengths,
        };
    }

    /**
     * Get Form 6C Higher details for a school (Admin only).
     * Returns student strength for classes >= 11.
     */
    async getForm6CHigherBySchool(schoolId: string) {
        const school = await this.db.school.findUnique({
            where: { id: schoolId },
            include: { district: true },
        });

        if (!school) {
            throw new NotFoundException('School not found');
        }

        const strengths = await this.db.studentStrength.findMany({
            where: {
                school_id: schoolId,
                class_level: { gte: 11 },
            },
            orderBy: { class_level: 'asc' },
        });

        return {
            school,
            strengths,
        };
    }

    /**
     * Get Form 6D details for a school (Admin only).
     * Returns teaching staff for Class 11 & 12.
     */
    async getForm6DBySchool(schoolId: string) {
        const school = await this.db.school.findUnique({
            where: { id: schoolId },
            include: { district: true },
        });

        if (!school) {
            throw new NotFoundException('School not found');
        }

        const staffList = await this.db.faculty.findMany({
            where: {
                school_id: schoolId,
                faculty_type: 'TEACHING',
                teaching_assignments: {
                    some: {
                        class_level: { gte: 11 },
                    },
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        profile_image_url: true,
                    },
                },
                teaching_assignments: {
                    where: {
                        class_level: { gte: 11 },
                    },
                },
            },
        });

        return {
            school,
            staff: staffList,
        };
    }

    // ===========================
    // HEADMASTER ENDPOINTS
    // ===========================

    /**
     * Get teaching staff for Pre-Primary to Class 10 (Form 6A).
     */
    async getTeachingStaffLower(userId: string) {
        const faculty = await this.getUserFaculty(userId);
        
        // Get all faculty at the same school who teach classes <= 10
        const staffList = await this.db.faculty.findMany({
            where: {
                school_id: faculty.school_id,
                faculty_type: 'TEACHING',
                teaching_assignments: {
                    some: {
                        class_level: { lte: 10 },
                    },
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        profile_image_url: true,
                    },
                },
                teaching_assignments: {
                    where: {
                        class_level: { lte: 10 },
                    },
                },
            },
        });

        return staffList;
    }

    /**
     * Get teaching staff for Class 11 & 12 (Form 6D).
     */
    async getTeachingStaffHigher(userId: string) {
        const faculty = await this.getUserFaculty(userId);
        
        const staffList = await this.db.faculty.findMany({
            where: {
                school_id: faculty.school_id,
                faculty_type: 'TEACHING',
                teaching_assignments: {
                    some: {
                        class_level: { gte: 11 },
                    },
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        profile_image_url: true,
                    },
                },
                teaching_assignments: {
                    where: {
                        class_level: { gte: 11 },
                    },
                },
            },
        });

        return staffList;
    }

    /**
     * Verify/Reject a faculty member (headmaster only).
     */
    async verifyFaculty(
        userId: string,
        facultyId: string,
        status: ApprovalStatus,
        ipAddress: string | null,
    ) {
        const headmaster = await this.getUserFaculty(userId);
        
        // Verify the faculty belongs to the same school
        const targetFaculty = await this.db.faculty.findUnique({
            where: { id: facultyId },
        });

        if (!targetFaculty) {
            throw new NotFoundException('Faculty not found');
        }

        if (targetFaculty.school_id !== headmaster.school_id) {
            throw new ForbiddenException('You can only verify faculty at your own school');
        }

        // Update the faculty status
        const updated = await this.db.faculty.update({
            where: { id: facultyId },
            data: {
                approval_status: status,
                approved_by: userId,
            },
        });

        await this.auditLogsService.log(
            `FACULTY_${status}`,
            'Faculty',
            facultyId,
            userId,
            ipAddress,
        );

        // Send notification to the faculty member
        if (status === 'APPROVED') {
            await this.notificationsService.notifyProfileApproved(targetFaculty.user_id);
        } else if (status === 'REJECTED') {
            await this.notificationsService.notifyProfileRejected(targetFaculty.user_id);
        }

        return updated;
    }

    /**
     * Get non-teaching staff for the school (Form 6B).
     */
    async getNonTeachingStaff(userId: string) {
        const faculty = await this.getUserFaculty(userId);
        
        const staffList = await this.db.nonTeachingStaff.findMany({
            where: {
                school_id: faculty.school_id,
            },
        });

        // Get the actual form submission status
        const formSubmission = await this.db.formSubmission.findUnique({
            where: {
                school_id_form_type: {
                    school_id: faculty.school_id,
                    form_type: '6B',
                },
            },
        });

        return {
            staff: staffList,
            form_status: formSubmission?.status || (staffList.length > 0 ? 'DRAFT' : 'NOT_SUBMITTED'),
            rejection_reason: formSubmission?.rejection_reason,
        };
    }

    /**
     * Create/update non-teaching staff (Form 6B).
     */
    async saveNonTeachingStaff(
        userId: string,
        data: {
            full_name: string;
            qualification: string;
            nature_of_work: string;
            years_of_service: number;
            phone: string;
        },
        ipAddress: string | null,
    ) {
        const faculty = await this.getUserFaculty(userId);

        const staff = await this.db.nonTeachingStaff.create({
            data: {
                school_id: faculty.school_id,
                full_name: data.full_name,
                qualification: data.qualification,
                nature_of_work: data.nature_of_work,
                years_of_service: data.years_of_service,
                phone: data.phone,
            },
        });

        await this.auditLogsService.log(
            'NON_TEACHING_STAFF_ADDED',
            'NonTeachingStaff',
            staff.id,
            userId,
            ipAddress,
        );

        return staff;
    }

    /**
     * Update non-teaching staff.
     */
    async updateNonTeachingStaff(
        userId: string,
        staffId: string,
        data: {
            full_name: string;
            qualification: string;
            nature_of_work: string;
            years_of_service: number;
            phone: string;
        },
        ipAddress: string | null,
    ) {
        const faculty = await this.getUserFaculty(userId);

        const existing = await this.db.nonTeachingStaff.findUnique({
            where: { id: staffId },
        });

        if (!existing || existing.school_id !== faculty.school_id) {
            throw new NotFoundException('Staff not found');
        }

        const updated = await this.db.nonTeachingStaff.update({
            where: { id: staffId },
            data: {
                full_name: data.full_name,
                qualification: data.qualification,
                nature_of_work: data.nature_of_work,
                years_of_service: data.years_of_service,
                phone: data.phone,
            },
        });

        await this.auditLogsService.log(
            'NON_TEACHING_STAFF_UPDATED',
            'NonTeachingStaff',
            staffId,
            userId,
            ipAddress,
        );

        return updated;
    }

    /**
     * Get student strength for lower classes (Form 6C lower).
     */
    async getStudentStrengthLower(userId: string) {
        const faculty = await this.getUserFaculty(userId);
        
        const strengths = await this.db.studentStrength.findMany({
            where: {
                school_id: faculty.school_id,
                class_level: { lte: 10 },
            },
            orderBy: { class_level: 'asc' },
        });

        // Get the actual form submission status
        const formSubmission = await this.db.formSubmission.findUnique({
            where: {
                school_id_form_type: {
                    school_id: faculty.school_id,
                    form_type: '6C_LOWER',
                },
            },
        });

        return {
            strengths,
            form_status: formSubmission?.status || (strengths.length > 0 ? 'DRAFT' : 'NOT_SUBMITTED'),
            rejection_reason: formSubmission?.rejection_reason,
        };
    }

    /**
     * Get student strength for higher classes (Form 6C higher).
     * Note: This would need stream support in the schema for proper implementation.
     */
    async getStudentStrengthHigher(userId: string) {
        const faculty = await this.getUserFaculty(userId);
        
        const strengths = await this.db.studentStrength.findMany({
            where: {
                school_id: faculty.school_id,
                class_level: { gte: 11 },
            },
            orderBy: { class_level: 'asc' },
        });

        // Get the actual form submission status
        const formSubmission = await this.db.formSubmission.findUnique({
            where: {
                school_id_form_type: {
                    school_id: faculty.school_id,
                    form_type: '6C_HIGHER',
                },
            },
        });

        return {
            strengths,
            form_status: formSubmission?.status || (strengths.length > 0 ? 'DRAFT' : 'NOT_SUBMITTED'),
            rejection_reason: formSubmission?.rejection_reason,
        };
    }

    /**
     * Submit student strength for lower classes (Form 6C lower).
     */
    async submitStudentStrengthLower(
        userId: string,
        data: Array<{
            class_level: number;
            boys: number;
            girls: number;
            sections: number;
        }>,
        ipAddress: string | null,
    ) {
        const faculty = await this.getUserFaculty(userId);

        // Upsert each class level
        for (const item of data) {
            await this.db.studentStrength.upsert({
                where: {
                    school_id_class_level: {
                        school_id: faculty.school_id,
                        class_level: item.class_level,
                    },
                },
                create: {
                    school_id: faculty.school_id,
                    class_level: item.class_level,
                    boys: item.boys,
                    girls: item.girls,
                    sections: item.sections,
                },
                update: {
                    boys: item.boys,
                    girls: item.girls,
                    sections: item.sections,
                },
            });
        }

        await this.auditLogsService.log(
            'FORM_6C_LOWER_SUBMITTED',
            'StudentStrength',
            faculty.school_id,
            userId,
            ipAddress,
        );

        return { success: true };
    }

    /**
     * Submit student strength for higher classes (Form 6C higher).
     */
    async submitStudentStrengthHigher(
        userId: string,
        data: Array<{
            class_level: number;
            stream?: string;
            boys: number;
            girls: number;
            sections: number;
        }>,
        ipAddress: string | null,
    ) {
        const faculty = await this.getUserFaculty(userId);

        // For now, we'll just use class_level (without stream support in DB)
        // In a real implementation, you'd add stream column to StudentStrength
        for (const item of data) {
            // Use a composite key approach - for now just use class level
            // You may want to add stream to the unique constraint
            await this.db.studentStrength.upsert({
                where: {
                    school_id_class_level: {
                        school_id: faculty.school_id,
                        class_level: item.class_level,
                    },
                },
                create: {
                    school_id: faculty.school_id,
                    class_level: item.class_level,
                    boys: item.boys,
                    girls: item.girls,
                    sections: item.sections,
                },
                update: {
                    boys: item.boys,
                    girls: item.girls,
                    sections: item.sections,
                },
            });
        }

        await this.auditLogsService.log(
            'FORM_6C_HIGHER_SUBMITTED',
            'StudentStrength',
            faculty.school_id,
            userId,
            ipAddress,
        );

        return { success: true };
    }

    /**
     * Submit Form 6A.
     */
    async submitForm6A(userId: string, ipAddress: string | null) {
        const faculty = await this.getUserFaculty(userId);

        await this.auditLogsService.log(
            'FORM_6A_SUBMITTED',
            'School',
            faculty.school_id,
            userId,
            ipAddress,
        );

        return { success: true };
    }

    /**
     * Submit Form 6B.
     */
    async submitForm6B(userId: string, ipAddress: string | null) {
        const faculty = await this.getUserFaculty(userId);

        await this.auditLogsService.log(
            'FORM_6B_SUBMITTED',
            'School',
            faculty.school_id,
            userId,
            ipAddress,
        );

        return { success: true };
    }

    /**
     * Submit Form 6D.
     */
    async submitForm6D(userId: string, ipAddress: string | null) {
        const faculty = await this.getUserFaculty(userId);

        await this.auditLogsService.log(
            'FORM_6D_SUBMITTED',
            'School',
            faculty.school_id,
            userId,
            ipAddress,
        );

        return { success: true };
    }

    /**
     * Get all staff at the school (for View Staffs screen).
     */
    async getSchoolStaffs(userId: string) {
        const faculty = await this.getUserFaculty(userId);
        
        return this.db.faculty.findMany({
            where: {
                school_id: faculty.school_id,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        profile_image_url: true,
                    },
                },
                teaching_assignments: true,
            },
            orderBy: {
                user: {
                    name: 'asc',
                },
            },
        });
    }

    /**
     * Helper to get user's faculty record.
     */
    private async getUserFaculty(userId: string) {
        const faculty = await this.db.faculty.findUnique({
            where: { user_id: userId },
        });

        if (!faculty) {
            throw new NotFoundException('Please complete your profile first');
        }

        return faculty;
    }
}
