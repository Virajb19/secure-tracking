import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';

/**
 * Master Data Service.
 * Provides access to districts, schools, classes, and subjects.
 * Includes CRUD operations for schools and subjects (Admin/Super Admin only).
 */
@Injectable()
export class MasterDataService {
    constructor(private readonly db: PrismaService) { }

    // ========================================
    // READ-ONLY ENDPOINTS
    // ========================================

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
     * Get schools with server-side pagination, search, and district filter.
     * Used by the admin Manage page's schools table.
     */
    async getSchoolsPaginated(params: {
        limit?: number;
        offset?: number;
        districtId?: string;
        search?: string;
    }) {
        const limit = params.limit ?? 50;
        const offset = params.offset ?? 0;

        const where: any = {};

        if (params.districtId) {
            where.district_id = params.districtId;
        }

        if (params.search) {
            where.OR = [
                { name: { contains: params.search, mode: 'insensitive' } },
                { registration_code: { contains: params.search, mode: 'insensitive' } },
            ];
        }

        const [data, total] = await Promise.all([
            this.db.school.findMany({
                where,
                include: { district: true },
                orderBy: { name: 'asc' },
                take: limit,
                skip: offset,
            }),
            this.db.school.count({ where }),
        ]);

        return {
            data,
            total,
            hasMore: offset + data.length < total,
        };
    }

    /**
     * Get distinct class levels from Subject table.
     * Falls back to predefined list if no subjects exist.
     */
    async getClasses() {
        const subjects = await this.db.subject.findMany({
            where: { is_active: true },
            select: { class_level: true },
            distinct: ['class_level'],
            orderBy: { class_level: 'asc' },
        });

        if (subjects.length === 0) {
            return [8, 9, 10, 11, 12];
        }

        return subjects.map(s => s.class_level);
    }

    /**
     * Get subjects from the Subject table.
     * Optionally filtered by class_level.
     * Returns distinct subject names sorted alphabetically.
     */
    async getSubjects(classLevel?: number) {
        const where: any = { is_active: true };
        if (classLevel) {
            where.class_level = classLevel;
        }

        const subjects = await this.db.subject.findMany({
            where,
            select: { name: true },
            distinct: ['name'],
            orderBy: { name: 'asc' },
        });

        return subjects.map(s => s.name);
    }

    /**
     * Get all subjects with full details (for admin management).
     * Optionally filtered by class_level.
     */
    async getSubjectsDetailed(classLevel?: number) {
        const where: any = {};
        if (classLevel) {
            where.class_level = classLevel;
        }

        return this.db.subject.findMany({
            where,
            orderBy: [{ class_level: 'asc' }, { name: 'asc' }],
        });
    }

    // ========================================
    // SCHOOL CRUD (Admin/Super Admin only)
    // ========================================

    /**
     * Create a new school.
     * Validates uniqueness of name and registration_code.
     */
    async createSchool(data: { name: string; registration_code: string; district_id: string }) {
        // Check for duplicate name
        const existingByName = await this.db.school.findFirst({
            where: { name: { equals: data.name, mode: 'insensitive' } },
        });
        if (existingByName) {
            throw new ConflictException(`School with name "${data.name}" already exists`);
        }

        // Check for duplicate registration code
        const existingByCode = await this.db.school.findUnique({
            where: { registration_code: data.registration_code },
        });
        if (existingByCode) {
            throw new ConflictException(`School with registration code "${data.registration_code}" already exists`);
        }

        return this.db.school.create({
            data: {
                name: data.name,
                registration_code: data.registration_code,
                district_id: data.district_id,
            },
            include: { district: true },
        });
    }

    /**
     * Update an existing school.
     */
    async updateSchool(id: string, data: { name?: string; registration_code?: string; district_id?: string }) {
        const school = await this.db.school.findUnique({ where: { id } });
        if (!school) {
            throw new NotFoundException('School not found');
        }

        // Check uniqueness if name is being changed
        if (data.name && data.name !== school.name) {
            const existingByName = await this.db.school.findFirst({
                where: { name: { equals: data.name, mode: 'insensitive' }, id: { not: id } },
            });
            if (existingByName) {
                throw new ConflictException(`School with name "${data.name}" already exists`);
            }
        }

        // Check uniqueness if registration_code is being changed
        if (data.registration_code && data.registration_code !== school.registration_code) {
            const existingByCode = await this.db.school.findFirst({
                where: { registration_code: data.registration_code, id: { not: id } },
            });
            if (existingByCode) {
                throw new ConflictException(`School with registration code "${data.registration_code}" already exists`);
            }
        }

        return this.db.school.update({
            where: { id },
            data,
            include: { district: true },
        });
    }

    /**
     * Delete a school. Only allowed if no faculties, events, etc. are linked.
     */
    async deleteSchool(id: string) {
        const school = await this.db.school.findUnique({
            where: { id },
            include: {
                faculties: { select: { id: true }, take: 1 },
                events: { select: { id: true }, take: 1 },
                notices: { select: { id: true }, take: 1 },
            },
        });

        if (!school) {
            throw new NotFoundException('School not found');
        }

        if (school.faculties.length > 0 || school.events.length > 0 || school.notices.length > 0) {
            throw new ConflictException('Cannot delete school with existing records (faculties, events, or notices). Remove them first.');
        }

        return this.db.school.delete({ where: { id } });
    }

    // ========================================
    // SUBJECT CRUD (Admin/Super Admin only)
    // ========================================

    /**
     * Create a new subject (with class level association).
     * Validates uniqueness of (name, class_level).
     */
    async createSubject(data: { name: string; class_level: number }) {
        const existing = await this.db.subject.findUnique({
            where: { name_class_level: { name: data.name, class_level: data.class_level } },
        });
        if (existing) {
            throw new ConflictException(`Subject "${data.name}" already exists for class ${data.class_level}`);
        }

        return this.db.subject.create({
            data: {
                name: data.name,
                class_level: data.class_level,
            },
        });
    }

    /**
     * Bulk create subjects (add a subject to multiple class levels at once).
     */
    async createSubjectBulk(data: { name: string; class_levels: number[] }) {
        const results = [];
        const errors = [];

        for (const classLevel of data.class_levels) {
            const existing = await this.db.subject.findUnique({
                where: { name_class_level: { name: data.name, class_level: classLevel } },
            });
            if (existing) {
                errors.push(`Subject "${data.name}" already exists for class ${classLevel}`);
                continue;
            }

            const subject = await this.db.subject.create({
                data: { name: data.name, class_level: classLevel },
            });
            results.push(subject);
        }

        return { created: results, errors };
    }

    /**
     * Update a subject.
     */
    async updateSubject(id: string, data: { name?: string; class_level?: number; is_active?: boolean }) {
        const subject = await this.db.subject.findUnique({ where: { id } });
        if (!subject) {
            throw new NotFoundException('Subject not found');
        }

        // Check uniqueness if name or class_level is changing
        const newName = data.name ?? subject.name;
        const newClassLevel = data.class_level ?? subject.class_level;

        if (newName !== subject.name || newClassLevel !== subject.class_level) {
            const existing = await this.db.subject.findFirst({
                where: {
                    name: { equals: newName, mode: 'insensitive' },
                    class_level: newClassLevel,
                    id: { not: id },
                },
            });
            if (existing) {
                throw new ConflictException(`Subject "${newName}" already exists for class ${newClassLevel}`);
            }
        }

        return this.db.subject.update({
            where: { id },
            data,
        });
    }

    /**
     * Delete a subject.
     */
    async deleteSubject(id: string) {
        const subject = await this.db.subject.findUnique({ where: { id } });
        if (!subject) {
            throw new NotFoundException('Subject not found');
        }

        return this.db.subject.delete({ where: { id } });
    }
}

