import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { AppwriteService } from '../appwrite';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCircularDto } from './dto/create-circular.dto';

@Injectable()
export class CircularsService {
    constructor(
        private readonly db: PrismaService,
        private readonly appwrite: AppwriteService,
        private readonly notificationsService: NotificationsService,
    ) { }

    /**
     * Get all active circulars with pagination.
     * - Admins see all circulars
     * - Other users see: global circulars + district-level + school-level
     */
    async getCirculars(userId: string, limit = 20, offset = 0, search?: string) {
        // Get user's school and district if they have a faculty profile
        const faculty = await this.db.faculty.findUnique({
            where: { user_id: userId },
            select: {
                school_id: true,
                school: { select: { district_id: true } }
            },
        });

        // Get user's role
        const user = await this.db.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });

        // CMS roles (Admin, SubjectCoordinator, Assistant) see all circulars with pagination
        const isCmsRole = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ||
            user?.role === 'SUBJECT_COORDINATOR' || user?.role === 'ASSISTANT';

        if (isCmsRole) {
            const where: any = { is_active: true };

            // Add search filter if provided
            if (search) {
                where.OR = [
                    { title: { contains: search, mode: 'insensitive' } },
                    { circular_no: { contains: search, mode: 'insensitive' } },
                    { issued_by: { contains: search, mode: 'insensitive' } },
                ];
            }

            const [data, total] = await Promise.all([
                this.db.circular.findMany({
                    where,
                    orderBy: [{ issued_date: 'desc' }, { created_at: 'desc' }],
                    take: limit,
                    skip: offset,
                    include: {
                        district: { select: { name: true } },
                        school: { select: { name: true } },
                        creator: { select: { name: true } },
                    },
                }),
                this.db.circular.count({ where }),
            ]);

            return {
                data,
                total,
                hasMore: offset + data.length < total,
            };
        }

        const schoolId = faculty?.school_id;
        const districtId = faculty?.school?.district_id;

        // Build filter conditions for visibility:
        // 1. Global circulars (no school_id AND no district_id AND no targeted schools)
        // 2. District-level circulars (matches user's district, no school_id, no targeted schools)
        // 3. School-level circulars (matches user's school via school_id)
        // 4. Multi-school circulars (user's school is in targetedSchools M2M)
        const orConditions: object[] = [
            // Global circulars: no district, no school, no targeted schools
            {
                school_id: null,
                district_id: null,
                targetedSchools: { none: {} }
            },
        ];

        if (districtId) {
            // District-level circulars: matches district, no school, no targeted schools
            orConditions.push({
                district_id: districtId,
                school_id: null,
                targetedSchools: { none: {} }
            });
        }

        if (schoolId) {
            // School-level circulars: direct school_id match
            orConditions.push({ school_id: schoolId });
            // Multi-school circulars: school is in M2M targetedSchools
            orConditions.push({ targetedSchools: { some: { school_id: schoolId } } });
        }

        const where: any = {
            is_active: true,
            OR: orConditions,
        };

        const [data, total] = await Promise.all([
            this.db.circular.findMany({
                where,
                orderBy: [{ issued_date: 'desc' }, { created_at: 'desc' }],
                take: limit,
                skip: offset,
                include: {
                    district: { select: { name: true } },
                    school: { select: { name: true } },
                    creator: { select: { name: true } },
                },
            }),
            this.db.circular.count({ where }),
        ]);

        return {
            data,
            total,
            hasMore: offset + data.length < total,
        };
    }

    /**
     * Get a single circular by ID.
     */
    async getCircularById(circularId: string) {
        return this.db.circular.findUnique({
            where: { id: circularId },
            include: {
                district: { select: { name: true } },
                school: { select: { name: true } },
                creator: { select: { name: true } },
            },
        });
    }

    /**
     * Search circulars by title or circular number.
     * Respects same visibility rules as getCirculars.
     */
    async searchCirculars(userId: string, query: string) {
        const faculty = await this.db.faculty.findUnique({
            where: { user_id: userId },
            select: {
                school_id: true,
                school: { select: { district_id: true } }
            },
        });

        const user = await this.db.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });

        // CMS roles see all circulars in search
        const isCmsRole = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ||
            user?.role === 'SUBJECT_COORDINATOR' || user?.role === 'ASSISTANT';
        const schoolId = faculty?.school_id;
        const districtId = faculty?.school?.district_id;

        // Build visibility filter
        let visibilityFilter: object = {};

        if (!isCmsRole) {
            const orConditions: object[] = [
                { school_id: null, district_id: null }, // Global
            ];
            if (districtId) {
                orConditions.push({ district_id: districtId, school_id: null });
            }
            if (schoolId) {
                orConditions.push({ school_id: schoolId });
            }
            visibilityFilter = { OR: orConditions };
        }

        return this.db.circular.findMany({
            where: {
                is_active: true,
                AND: [
                    {
                        OR: [
                            { title: { contains: query, mode: 'insensitive' } },
                            { circular_no: { contains: query, mode: 'insensitive' } },
                            { description: { contains: query, mode: 'insensitive' } },
                        ],
                    },
                    visibilityFilter,
                ],
            },
            orderBy: [{ issued_date: 'desc' }, { created_at: 'desc' }],
            include: {
                district: { select: { name: true } },
                school: { select: { name: true } },
                creator: { select: { name: true } },
            },
        });
    }

    /**
     * Create a new circular (Admin only).
     * Supports creating circulars for multiple schools and sends Firebase notifications.
     */
    async createCircular(
        userId: string,
        dto: CreateCircularDto,
        file?: Express.Multer.File,
        ip?: string | null,
    ) {
        if (!dto.title || !dto.issued_by || !dto.issued_date) {
            throw new BadRequestException('Title, issued_by, and issued_date are required');
        }

        // Handle file upload to Appwrite bucket
        let fileUrl: string | null = null;
        if (file) {
            console.log('[CircularsService] Uploading file to Appwrite:', file.originalname);
            const appwriteUrl = await this.appwrite.uploadFile(
                file.buffer,
                file.originalname,
                file.mimetype,
            );
            if (appwriteUrl) {
                fileUrl = appwriteUrl;
                console.log('[CircularsService] File uploaded to Appwrite:', fileUrl);
            } else {
                throw new BadRequestException(
                    'Failed to upload file to Appwrite. Please check Appwrite configuration (APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_BUCKET_ID).'
                );
            }
        }

        // Generate circular number ONCE
        const year = new Date().getFullYear();
        const count = await this.db.circular.count({
            where: {
                circular_no: { startsWith: `CIRC/${year}/` },
            },
        });
        const circularNo = `CIRC/${year}/${String(count + 1).padStart(4, '0')}`;

        // Determine school_ids - support both single school_id and multiple school_ids
        const schoolIds: string[] = [];
        if (dto.school_ids && dto.school_ids.length > 0) {
            schoolIds.push(...dto.school_ids);
        } else if (dto.school_id) {
            schoolIds.push(dto.school_id);
        }

        // IMPORTANT: Create ONE circular only!
        // - If single school selected: use school_id (backward compatible)
        // - If multiple schools: use CircularSchool M2M relation
        // - If no schools: global/district level
        const singleSchoolId = schoolIds.length === 1 ? schoolIds[0] : null;

        const circular = await this.db.circular.create({
            data: {
                circular_no: circularNo,
                title: dto.title,
                description: dto.description || null,
                file_url: fileUrl,
                issued_by: dto.issued_by,
                issued_date: new Date(dto.issued_date),
                effective_date: dto.effective_date ? new Date(dto.effective_date) : null,
                is_active: true,
                district_id: dto.district_id || null,
                school_id: singleSchoolId, // Only set if exactly 1 school selected
                created_by: userId,
            },
            include: {
                district: { select: { name: true } },
                school: { select: { name: true } },
                creator: { select: { name: true } },
            },
        });

        // If multiple schools selected, create CircularSchool entries (M2M)
        if (schoolIds.length > 1) {
            await this.db.circularSchool.createMany({
                data: schoolIds.map(schoolId => ({
                    circular_id: circular.id,
                    school_id: schoolId,
                })),
            });
            console.log(`[CircularsService] Created ${schoolIds.length} CircularSchool entries for circular ${circular.id}`);
        }

        // Log the action
        await this.db.auditLog.create({
            data: {
                user_id: userId,
                action: 'CIRCULAR_CREATED',
                entity_type: 'Circular',
                entity_id: circular.id,
                ip_address: ip || null,
            },
        });

        // Send notifications based on scope
        if (schoolIds.length === 0) {
            // Global or district-level: notify all in district or everyone
            await this.notifyCircularUsers(dto.title, dto.district_id, undefined);
        } else if (schoolIds.length === 1) {
            // Single school: notify that school
            await this.notifyCircularUsers(dto.title, dto.district_id, schoolIds[0]);
        } else {
            // Multiple schools: notify each selected school
            await this.notifyMultipleSchools(dto.title, schoolIds);
        }

        return circular;
    }

    /**
     * Send notifications to users of multiple schools
     */
    private async notifyMultipleSchools(circularTitle: string, schoolIds: string[]) {
        for (const schoolId of schoolIds) {
            await this.notificationsService.notifyNewCircular(
                circularTitle,
                undefined,
                schoolId,
            );
        }
    }

    /**
     * Send notifications for circular based on scope
     */
    private async notifyCircularUsers(
        circularTitle: string,
        districtId?: string,
        schoolId?: string,
    ) {
        await this.notificationsService.notifyNewCircular(
            circularTitle,
            districtId,
            schoolId,
        );
    }

    async deleteCircular(
        adminId: string,
        circularId: string,
        reason?: string | null,
        ip?: string | null,
    ) {
        const circular = await this.db.circular.findUnique({
            where: { id: circularId },
        });

        if (!circular) {
            throw new BadRequestException('Circular not found');
        }

        if (!circular.is_active) {
            throw new BadRequestException('Circular is already deleted');
        }

        // Soft delete by setting is_active to false
        await this.db.circular.update({
            where: { id: circularId },
            data: { is_active: false },
        });

        // Audit log (VERY IMPORTANT)
        await this.db.auditLog.create({
            data: {
                user_id: adminId,
                action: 'CIRCULAR_DELETED',
                entity_type: 'Circular',
                entity_id: circularId,
                ip_address: ip || null,
            },
        });

        return {
            message: 'Circular deleted successfully',
            circular_id: circularId,
            reason: reason || null,
        };
    }

}
