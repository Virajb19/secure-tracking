import { Injectable } from '@nestjs/common';
import { SelectionStatus } from '@prisma/client';
import { PrismaService } from '../prisma';

/**
 * Analytics Service
 * 
 * Provides analytics and ratio calculations.
 */
@Injectable()
export class AnalyticsService {
    constructor(private readonly db: PrismaService) { }

    /**
     * Calculate Teacher-Student Ratio for a school
     */
    async getTeacherStudentRatio(schoolId: string) {
        // Get total students
        const studentStrengths = await this.db.studentStrength.findMany({
            where: { school_id: schoolId },
        });

        const totalStudents = studentStrengths.reduce(
            (sum, s) => sum + s.boys + s.girls,
            0,
        );

        // Get total teachers (approved faculty)
        const totalTeachers = await this.db.faculty.count({
            where: {
                school_id: schoolId,
                faculty_type: 'TEACHING',
                approval_status: 'APPROVED',
            },
        });

        const ratio = totalTeachers > 0
            ? (totalStudents / totalTeachers).toFixed(2)
            : 'N/A';

        return {
            school_id: schoolId,
            total_students: totalStudents,
            total_teachers: totalTeachers,
            ratio: ratio,
            ratio_display: totalTeachers > 0
                ? `1:${Math.round(totalStudents / totalTeachers)}`
                : 'No teachers',
        };
    }

    /**
     * Get Teacher-Student Ratio for all schools in a district
     */
    async getDistrictRatios(districtId: string) {
        const schools = await this.db.school.findMany({
            where: { district_id: districtId },
            select: { id: true, name: true },
        });

        const ratios = await Promise.all(
            schools.map(async (school) => {
                const ratioData = await this.getTeacherStudentRatio(school.id);
                return {
                    ...ratioData,
                    school_name: school.name,
                };
            }),
        );

        // Calculate district average
        const validRatios = ratios.filter(r => r.total_teachers > 0);
        const avgRatio = validRatios.length > 0
            ? (validRatios.reduce((sum, r) => sum + parseFloat(r.ratio as string), 0) / validRatios.length).toFixed(2)
            : 'N/A';

        return {
            district_id: districtId,
            schools: ratios,
            district_average_ratio: avgRatio,
        };
    }

    /**
     * Get overall statistics for dashboard
     */
    async getDashboardStats() {
        const [
            totalUsers,
            activeUsers,
            totalTeachers,
            approvedTeachers,
            pendingApprovals,
            totalSchools,
            totalDistricts,
            totalStudents,
        ] = await Promise.all([
            this.db.user.count(),
            this.db.user.count({ where: { is_active: true } }),
            this.db.user.count({ where: { role: 'TEACHER' } }),
            this.db.faculty.count({ where: { approval_status: 'APPROVED' } }),
            this.db.faculty.count({ where: { approval_status: 'PENDING' } }),
            this.db.school.count(),
            this.db.district.count(),
            this.db.studentStrength.aggregate({
                _sum: { boys: true, girls: true },
            }),
        ]);

        const studentCount = (totalStudents._sum.boys || 0) + (totalStudents._sum.girls || 0);

        return {
            total_users: totalUsers,
            active_users: activeUsers,
            total_teachers: totalTeachers,
            approved_teachers: approvedTeachers,
            pending_approvals: pendingApprovals,
            total_schools: totalSchools,
            total_districts: totalDistricts,
            total_students: studentCount,
            overall_ratio: approvedTeachers > 0
                ? `1:${Math.round(studentCount / approvedTeachers)}`
                : 'N/A',
        };
    }

    /**
     * Get class-wise student strength for a school
     */
    async getClassWiseStrength(schoolId: string) {
        const strengths = await this.db.studentStrength.findMany({
            where: { school_id: schoolId },
            orderBy: { class_level: 'asc' },
        });

        return strengths.map(s => ({
            class: s.class_level,
            boys: s.boys,
            girls: s.girls,
            total: s.boys + s.girls,
            sections: s.sections,
            avg_per_section: s.sections > 0
                ? Math.round((s.boys + s.girls) / s.sections)
                : 0,
        }));
    }

    /**
     * Get gender-wise user statistics
     */
    async getGenderStats() {
        const genderCounts = await this.db.user.groupBy({
            by: ['gender'],
            _count: {
                id: true,
            },
        });

        const result = {
            MALE: 0,
            FEMALE: 0,
            OTHER: 0,
            total: 0,
        };

        genderCounts.forEach((item) => {
            if (item.gender === 'MALE') result.MALE = item._count.id;
            else if (item.gender === 'FEMALE') result.FEMALE = item._count.id;
            else if (item.gender === 'OTHER') result.OTHER = item._count.id;
        });

        result.total = result.MALE + result.FEMALE + result.OTHER;

        return result;
    }

    /**
     * Get district-wise user statistics
     */
    async getDistrictWiseUserStats() {
        // Get all districts with user counts through faculty -> school -> district relationship
        const districts = await this.db.district.findMany({
            select: {
                id: true,
                name: true,
                schools: {
                    select: {
                        faculties: {
                            select: {
                                user_id: true,
                            },
                        },
                    },
                },
            },
        });

        const districtStats = districts.map((district) => {
            const userCount = district.schools.reduce((acc, school) => {
                return acc + school.faculties.length;
            }, 0);

            return {
                district_id: district.id,
                district_name: district.name,
                user_count: userCount,
            };
        });

        // Sort by user count descending
        districtStats.sort((a, b) => b.user_count - a.user_count);

        return districtStats;
    }

    /**
     * Get role-wise user statistics (excluding ADMIN and SUPER_ADMIN)
     */
    async getRoleStats() {
        const roleCounts = await this.db.user.groupBy({
            by: ['role'],
            where: {
                role: {
                    notIn: ['ADMIN', 'SUPER_ADMIN'],
                },
            },
            _count: {
                id: true,
            },
        });

        const result = roleCounts.map((item) => ({
            role: item.role,
            count: item._count.id,
        }));

        return result;
    }

    /**
     * Get active users count
     */
    async getActiveUsersCount() {
        const activeCount = await this.db.user.count({
            where: { is_active: true },
        });

        const totalCount = await this.db.user.count();

        return {
            active: activeCount,
            total: totalCount,
            inactive: totalCount - activeCount,
        };
    }

    /**
     * Get helpdesk tickets summary
     */
    async getHelpdeskSummary() {
        const [total, pending, resolved] = await Promise.all([
            this.db.helpdesk.count(),
            this.db.helpdesk.count({ where: { is_resolved: false } }),
            this.db.helpdesk.count({ where: { is_resolved: true } }),
        ]);

        return {
            total,
            pending,
            resolved,
        };
    }

    /**
     * Get pending actions summary for dashboard widget
     */
    async getPendingActionsSummary() {
        const [
            inactiveUsers,
            pendingFormSubmissions,
            pendingPaperSetterResponses,
            pendingHelpdeskTickets,
        ] = await Promise.all([
            // Inactive users count
            this.db.user.count({ where: { is_active: false } }),
            // Pending form submissions (status = SUBMITTED, awaiting approval)
            this.db.formSubmission.count({ where: { status: 'SUBMITTED' } }),
            // Pending paper setter/checker responses (status = INVITED)
            this.db.paperSetterSelection.count({ where: { status: SelectionStatus.INVITED } }),
            // Pending helpdesk tickets
            this.db.helpdesk.count({ where: { is_resolved: false } }),
        ]);

        return {
            inactive_users: inactiveUsers,
            pending_form_approvals: pendingFormSubmissions,
            pending_paper_setter: pendingPaperSetterResponses,
            pending_helpdesk: pendingHelpdeskTickets,
            total: inactiveUsers + pendingFormSubmissions + pendingPaperSetterResponses + pendingHelpdeskTickets,
        };
    }
}
