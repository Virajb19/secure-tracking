import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';

/**
 * Analytics Service
 * 
 * Provides analytics and ratio calculations.
 */
@Injectable()
export class AnalyticsService {
    constructor(private readonly db: PrismaService) {}

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
}
