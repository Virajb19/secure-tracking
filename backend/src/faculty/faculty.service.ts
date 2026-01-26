import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Faculty, User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma';
import { AuditLogsService, AuditAction } from '../audit-logs/audit-logs.service';
import { CompleteProfileDto } from './dto/complete-profile.dto';

/**
 * Faculty Service.
 * Handles faculty profile management.
 */
@Injectable()
export class FacultyService {
    constructor(
        private readonly db: PrismaService,
        private readonly auditLogsService: AuditLogsService,
    ) {}

    /**
     * Complete faculty profile.
     * Creates faculty record with teaching assignments.
     * IMPORTANT: Profile can only be created ONCE and cannot be updated.
     */
    async completeProfile(
        userId: string,
        dto: CompleteProfileDto,
        ipAddress: string | null,
    ): Promise<Faculty> {
        // Check if faculty already exists - profile can only be created once
        const existingFaculty = await this.db.faculty.findUnique({
            where: { user_id: userId },
        });

        if (existingFaculty) {
            throw new BadRequestException('Profile already exists. You can only create your profile once and it cannot be modified.');
        }

        // Get user to determine faculty type
        const user = await this.db.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const facultyType = user.role === UserRole.TEACHER ? 'TEACHING' : 'NON_TEACHING';

        // Build teaching assignments data
        const teachingAssignments = dto.teaching_classes.flatMap(tc => 
            tc.subjects.map(subject => ({
                class_level: tc.class_level,
                subject,
            }))
        );

        // Create new faculty - profile is immediately locked
        const faculty = await this.db.faculty.create({
            data: {
                user_id: userId,
                school_id: dto.school_id,
                faculty_type: facultyType,
                designation: dto.designation || user.role,
                highest_qualification: dto.highest_qualification,
                years_of_experience: dto.years_of_experience,
                approval_status: 'PENDING',
                is_profile_locked: true, // Profile is locked immediately
                teaching_assignments: {
                    create: teachingAssignments,
                },
            },
            include: {
                school: {
                    include: { district: true },
                },
                teaching_assignments: true,
            },
        });

        await this.auditLogsService.log(
            'PROFILE_COMPLETED',
            'Faculty',
            faculty.id,
            userId,
            ipAddress,
        );

        return faculty;
    }

    /**
     * Get faculty profile by user ID.
     */
    async getByUserId(userId: string): Promise<Faculty | null> {
        return this.db.faculty.findUnique({
            where: { user_id: userId },
            include: {
                school: {
                    include: { district: true },
                },
                teaching_assignments: true,
            },
        });
    }

    /**
     * Check if user has completed profile.
     */
    async hasCompletedProfile(userId: string): Promise<boolean> {
        const faculty = await this.db.faculty.findUnique({
            where: { user_id: userId },
        });
        return faculty !== null;
    }

    /**
     * Get colleagues (other faculty members at the same school with matching criteria).
     * 
     * Colleagues are defined as people who:
     * - Are in the same school AND
     * - Have the same designation/role OR teach the same subjects
     */
    async getColleagues(userId: string) {
        // First get the current user's faculty info including their designation and teaching assignments
        const currentFaculty = await this.db.faculty.findUnique({
            where: { user_id: userId },
            select: { 
                school_id: true, 
                designation: true,
                teaching_assignments: {
                    select: { subject: true }
                }
            },
        });

        if (!currentFaculty) {
            throw new NotFoundException('Please complete your profile first to view colleagues');
        }

        // Get current user's subjects
        const currentSubjects = currentFaculty.teaching_assignments.map(ta => ta.subject);

        // Get all faculty members at the same school except the current user
        const allSchoolColleagues = await this.db.faculty.findMany({
            where: {
                school_id: currentFaculty.school_id,
                user_id: { not: userId },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        role: true,
                        profile_image_url: true,
                    },
                },
                teaching_assignments: true,
            },
        });

        // Filter colleagues based on same designation OR same subjects (if teaching)
        const filteredColleagues = allSchoolColleagues.filter(colleague => {
            // Match by same designation
            if (currentFaculty.designation && 
                colleague.designation && 
                currentFaculty.designation.toLowerCase() === colleague.designation.toLowerCase()) {
                return true;
            }

            // Match by same subjects (if both are teaching)
            if (currentSubjects.length > 0) {
                const colleagueSubjects = colleague.teaching_assignments.map(ta => ta.subject);
                const hasCommonSubject = currentSubjects.some(subject => 
                    colleagueSubjects.includes(subject)
                );
                if (hasCommonSubject) {
                    return true;
                }
            }

            // If no designation match and no subject match, still include if in same school
            // (fallback to show all school colleagues if no specific criteria met)
            return true;
        });

        return filteredColleagues.map(colleague => ({
            id: colleague.id,
            name: colleague.user.name,
            email: colleague.user.email,
            phone: colleague.user.phone,
            designation: colleague.designation,
            highest_qualification: colleague.highest_qualification,
            years_of_experience: colleague.years_of_experience,
            subjects: [...new Set(colleague.teaching_assignments.map(ta => ta.subject))],
            profile_image_url: colleague.user.profile_image_url,
            approval_status: colleague.approval_status,
        }));
    }
}
