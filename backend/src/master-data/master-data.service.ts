import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';

/**
 * Master Data Service.
 * Provides access to districts, schools, classes, and subjects.
 */
@Injectable()
export class MasterDataService {
    constructor(private readonly db: PrismaService) {}

    /**
     * Get all districts.
     */
    async getDistricts() {
        return this.db.district.findMany({
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Get all schools, optionally filtered by district.
     */
    async getSchools(districtId?: string) {
        return this.db.school.findMany({
            where: districtId ? { district_id: districtId } : undefined,
            include: { district: true },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Get distinct class levels from teaching assignments.
     */
    async getClasses() {
        const assignments = await this.db.teachingAssignment.findMany({
            select: { class_level: true },
            distinct: ['class_level'],
            orderBy: { class_level: 'asc' },
        });
        return assignments.map(a => a.class_level);
    }

    /**
     * Get distinct subjects from teaching assignments.
     */
    async getSubjects() {
        const assignments = await this.db.teachingAssignment.findMany({
            select: { subject: true },
            distinct: ['subject'],
            orderBy: { subject: 'asc' },
        });
        return assignments.map(a => a.subject);
    }
}
