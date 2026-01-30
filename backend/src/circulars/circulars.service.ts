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
    ) {}

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

        // Admins see all circulars with pagination
        if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
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
                    orderBy: { issued_date: 'desc' },
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
        // 1. Global circulars (no school_id AND no district_id)
        // 2. District-level circulars (matches user's district, no school_id)
        // 3. School-level circulars (matches user's school)
        const orConditions: object[] = [
            { school_id: null, district_id: null }, // Global circulars
        ];

        if (districtId) {
            orConditions.push({ district_id: districtId, school_id: null }); // District-level
        }

        if (schoolId) {
            orConditions.push({ school_id: schoolId }); // School-level
        }

        const where: any = {
            is_active: true,
            OR: orConditions,
        };

        const [data, total] = await Promise.all([
            this.db.circular.findMany({
                where,
                orderBy: { issued_date: 'desc' },
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

        const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
        const schoolId = faculty?.school_id;
        const districtId = faculty?.school?.district_id;

        // Build visibility filter
        let visibilityFilter: object = {};
        
        if (!isAdmin) {
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
            orderBy: { issued_date: 'desc' },
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

        // Determine school_ids - support both single school_id and multiple school_ids
        const schoolIds: string[] = [];
        if (dto.school_ids && dto.school_ids.length > 0) {
            schoolIds.push(...dto.school_ids);
        } else if (dto.school_id) {
            schoolIds.push(dto.school_id);
        }

        const createdCirculars: any[] = [];
        const year = new Date().getFullYear();

        // If no specific schools selected, create one global/district-level circular
        if (schoolIds.length === 0) {
            const count = await this.db.circular.count({
                where: {
                    circular_no: { startsWith: `CIRC/${year}/` },
                },
            });
            const circularNo = `CIRC/${year}/${String(count + 1).padStart(4, '0')}`;

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
                    school_id: null,
                    created_by: userId,
                },
                include: {
                    district: { select: { name: true } },
                    school: { select: { name: true } },
                    creator: { select: { name: true } },
                },
            });

            createdCirculars.push(circular);

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

            // Send notifications - if district-level, notify all schools in district
            // If global, notify all teachers and headmasters
            await this.notifyCircularUsers(dto.title, dto.district_id, undefined);
        } else {
            // Create a circular for each selected school
            for (const schoolId of schoolIds) {
                const count = await this.db.circular.count({
                    where: {
                        circular_no: { startsWith: `CIRC/${year}/` },
                    },
                });
                const circularNo = `CIRC/${year}/${String(count + 1).padStart(4, '0')}`;

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
                        school_id: schoolId,
                        created_by: userId,
                    },
                    include: {
                        district: { select: { name: true } },
                        school: { select: { name: true } },
                        creator: { select: { name: true } },
                    },
                });

                createdCirculars.push(circular);

                // Log the action for each circular
                await this.db.auditLog.create({
                    data: {
                        user_id: userId,
                        action: 'CIRCULAR_CREATED',
                        entity_type: 'Circular',
                        entity_id: circular.id,
                        ip_address: ip || null,
                    },
                });
            }

            // Send Firebase notifications to all selected schools
            await this.notifyMultipleSchools(dto.title, schoolIds);
        }

        // Return first circular for backward compatibility, or all if multiple
        return createdCirculars.length === 1 ? createdCirculars[0] : createdCirculars;
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
