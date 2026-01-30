import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { AppwriteService } from '../appwrite';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InvitationStatus, UserRole, SchoolEventType } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface CreateEventDto {
    title: string;
    description?: string;
    event_type: SchoolEventType;
    event_date: string;
    event_end_date?: string;
    event_time?: string;
    location?: string;
    activity_type?: string;
    male_participants?: number;
    female_participants?: number;
    district_id?: string;
    school_id?: string;
    invited_user_ids?: string[];
}

export interface UpdateEventDto {
    title?: string;
    description?: string;
    event_type?: SchoolEventType;
    event_date?: string;
    event_end_date?: string;
    event_time?: string;
    location?: string;
    activity_type?: string;
    male_participants?: number;
    female_participants?: number;
}

export interface EventFilterDto {
    from_date?: string;
    to_date?: string;
    district_id?: string;
    event_type?: SchoolEventType;
}

export interface RespondToInvitationDto {
    status: 'ACCEPTED' | 'REJECTED';
    rejection_reason?: string;
}

export interface CreateSchoolEventDto {
    title: string;
    description?: string;
    event_type?: SchoolEventType;
    type?: SchoolEventType; // alias for mobile app compatibility
    event_date: string;
    event_end_date?: string;
    event_time?: string;
    location?: string;
    activity_type?: string;
    male_participants?: number;
    female_participants?: number;
}

@Injectable()
export class EventsService {
    constructor(
        private readonly db: PrismaService,
        private readonly appwrite: AppwriteService,
        private readonly auditLogsService: AuditLogsService,
        private readonly notificationsService: NotificationsService,
    ) {}

    /**
     * Get all events (Admin view - all events with invitation stats).
     * Supports filtering by date range, district, event type, and pagination.
     */
    async getAllEventsAdmin(filters?: EventFilterDto, limit = 20, offset = 0) {
        const whereClause: any = { is_active: true };

        // Apply date range filter
        if (filters?.from_date || filters?.to_date) {
            whereClause.event_date = {};
            if (filters.from_date) {
                whereClause.event_date.gte = new Date(filters.from_date);
            }
            if (filters.to_date) {
                whereClause.event_date.lte = new Date(filters.to_date);
            }
        }

        // Apply district filter
        if (filters?.district_id) {
            whereClause.district_id = filters.district_id;
        }

        // Apply event type filter
        if (filters?.event_type) {
            whereClause.event_type = filters.event_type;
        }

        const [events, total] = await Promise.all([
            this.db.event.findMany({
                where: whereClause,
                orderBy: { event_date: 'desc' },
                take: limit,
                skip: offset,
                include: {
                    creator: { select: { id: true, name: true } },
                    school: { select: { id: true, name: true } },
                    district: { select: { id: true, name: true } },
                    invitations: {
                        select: { status: true },
                    },
                },
            }),
            this.db.event.count({ where: whereClause }),
        ]);

        // Add invitation counts
        const data = events.map(event => {
            const accepted = event.invitations.filter(i => i.status === 'ACCEPTED').length;
            const rejected = event.invitations.filter(i => i.status === 'REJECTED').length;
            const pending = event.invitations.filter(i => i.status === 'PENDING').length;
            const totalInvites = event.invitations.length;

            return {
                ...event,
                invitations: undefined,
                invitation_stats: {
                    total: totalInvites,
                    accepted,
                    rejected,
                    pending,
                },
            };
        });
        
        return {
            data,
            total,
            hasMore: offset + data.length < total,
        };
    }

    /**
     * Get single event with full details including invitations.
     */
    async getEventById(eventId: string) {
        const event = await this.db.event.findUnique({
            where: { id: eventId },
            include: {
                creator: { select: { id: true, name: true } },
                school: { select: { id: true, name: true } },
                district: { select: { id: true, name: true } },
                invitations: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                phone: true,
                                role: true,
                            },
                        },
                    },
                    orderBy: { created_at: 'asc' },
                },
            },
        });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        // Calculate stats
        const accepted = event.invitations.filter(i => i.status === 'ACCEPTED').length;
        const rejected = event.invitations.filter(i => i.status === 'REJECTED').length;
        const pending = event.invitations.filter(i => i.status === 'PENDING').length;

        return {
            ...event,
            invitation_stats: {
                total: event.invitations.length,
                accepted,
                rejected,
                pending,
            },
        };
    }

    /**
     * Get events for a user (only events they're invited to or global events).
     */
    async getEventsForUser(userId: string) {
        // Get user info
        const user = await this.db.user.findUnique({
            where: { id: userId },
            include: {
                faculty: {
                    select: {
                        school_id: true,
                        school: { select: { district_id: true } },
                    },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const schoolId = user.faculty?.school_id;
        const districtId = user.faculty?.school?.district_id;

        // Build OR conditions for visibility
        const orConditions: any[] = [
            // Events user is specifically invited to
            { invitations: { some: { user_id: userId } } },
            // Global events (no school or district)
            { school_id: null, district_id: null },
        ];

        if (districtId) {
            orConditions.push({ district_id: districtId, school_id: null });
        }
        if (schoolId) {
            orConditions.push({ school_id: schoolId });
        }

        const events = await this.db.event.findMany({
            where: {
                is_active: true,
                OR: orConditions,
            },
            orderBy: { event_date: 'asc' },
            include: {
                creator: { select: { id: true, name: true } },
                school: { select: { id: true, name: true } },
                district: { select: { id: true, name: true } },
                invitations: {
                    where: { user_id: userId },
                    select: {
                        id: true,
                        status: true,
                        rejection_reason: true,
                        responded_at: true,
                    },
                },
            },
        });

        return events.map(event => ({
            ...event,
            my_invitation: event.invitations[0] || null,
            invitations: undefined,
        }));
    }

    /**
     * Create a new event with optional flyer upload and user invitations.
     */
    async createEvent(
        userId: string,
        data: CreateEventDto,
        file?: Express.Multer.File,
        ipAddress?: string | null,
    ) {
        if (!data.title || !data.event_date) {
            throw new BadRequestException('Title and event date are required');
        }

        // Handle flyer upload
        let flyerUrl: string | null = null;
        if (file) {
            const appwriteUrl = await this.appwrite.uploadFile(
                file.buffer,
                file.originalname,
                file.mimetype,
            );
            if (appwriteUrl) {
                flyerUrl = appwriteUrl;
            } else {
                // Fallback to local storage
                const uploadDir = path.join(process.cwd(), 'uploads', 'events');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                const fileName = `${uuidv4()}${path.extname(file.originalname)}`;
                const localPath = path.join(uploadDir, fileName);
                fs.writeFileSync(localPath, file.buffer);
                flyerUrl = `/uploads/events/${fileName}`;
            }
        }

        const event = await this.db.event.create({
            data: {
                title: data.title,
                description: data.description,
                event_type: data.event_type || 'OTHER',
                event_date: new Date(data.event_date),
                event_end_date: data.event_end_date ? new Date(data.event_end_date) : null,
                event_time: data.event_time,
                location: data.location,
                activity_type: data.activity_type,
                male_participants: data.male_participants ? parseInt(String(data.male_participants)) : null,
                female_participants: data.female_participants ? parseInt(String(data.female_participants)) : null,
                flyer_url: flyerUrl,
                district_id: data.district_id || null,
                school_id: data.school_id || null,
                created_by: userId,
            },
        });

        // Create invitations if user IDs provided
        if (data.invited_user_ids && data.invited_user_ids.length > 0) {
            await this.db.eventInvitation.createMany({
                data: data.invited_user_ids.map(uid => ({
                    event_id: event.id,
                    user_id: uid,
                    status: 'PENDING',
                })),
                skipDuplicates: true,
            });
        }

        await this.auditLogsService.log(
            'EVENT_CREATED',
            'Event',
            event.id,
            userId,
            ipAddress || null,
        );

        return this.getEventById(event.id);
    }

    /**
     * Update an event.
     */
    async updateEvent(
        userId: string,
        eventId: string,
        data: UpdateEventDto,
        file?: Express.Multer.File,
        ipAddress?: string | null,
    ) {
        const event = await this.db.event.findUnique({
            where: { id: eventId },
        });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        // Handle flyer upload if new file provided
        let flyerUrl = event.flyer_url;
        if (file) {
            const appwriteUrl = await this.appwrite.uploadFile(
                file.buffer,
                file.originalname,
                file.mimetype,
            );
            if (appwriteUrl) {
                flyerUrl = appwriteUrl;
            } else {
                const uploadDir = path.join(process.cwd(), 'uploads', 'events');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                const fileName = `${uuidv4()}${path.extname(file.originalname)}`;
                const localPath = path.join(uploadDir, fileName);
                fs.writeFileSync(localPath, file.buffer);
                flyerUrl = `/uploads/events/${fileName}`;
            }
        }

        const updated = await this.db.event.update({
            where: { id: eventId },
            data: {
                ...(data.title && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.event_type && { event_type: data.event_type }),
                ...(data.event_date && { event_date: new Date(data.event_date) }),
                ...(data.event_end_date !== undefined && { event_end_date: data.event_end_date ? new Date(data.event_end_date) : null }),
                ...(data.event_time !== undefined && { event_time: data.event_time }),
                ...(data.location !== undefined && { location: data.location }),
                ...(data.activity_type !== undefined && { activity_type: data.activity_type }),
                ...(data.male_participants !== undefined && { male_participants: data.male_participants ? parseInt(String(data.male_participants)) : null }),
                ...(data.female_participants !== undefined && { female_participants: data.female_participants ? parseInt(String(data.female_participants)) : null }),
                flyer_url: flyerUrl,
            },
        });

        await this.auditLogsService.log(
            'EVENT_UPDATED',
            'Event',
            eventId,
            userId,
            ipAddress || null,
        );

        return this.getEventById(eventId);
    }

    /**
     * Soft delete an event.
     */
    async deleteEvent(
        userId: string,
        eventId: string,
        ipAddress?: string | null,
    ) {
        const event = await this.db.event.findUnique({
            where: { id: eventId },
        });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        await this.db.event.update({
            where: { id: eventId },
            data: { is_active: false },
        });

        await this.auditLogsService.log(
            'EVENT_DELETED',
            'Event',
            eventId,
            userId,
            ipAddress || null,
        );

        return { success: true, message: 'Event deleted successfully' };
    }

    /**
     * Invite users to an event.
     */
    async inviteUsersToEvent(
        eventId: string,
        userIds: string[],
        invitedBy: string,
        ipAddress?: string | null,
    ) {
        const event = await this.db.event.findUnique({
            where: { id: eventId },
        });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        // Filter out already invited users
        const existingInvitations = await this.db.eventInvitation.findMany({
            where: {
                event_id: eventId,
                user_id: { in: userIds },
            },
            select: { user_id: true },
        });

        const existingUserIds = new Set(existingInvitations.map(i => i.user_id));
        const newUserIds = userIds.filter(uid => !existingUserIds.has(uid));

        if (newUserIds.length > 0) {
            await this.db.eventInvitation.createMany({
                data: newUserIds.map(uid => ({
                    event_id: eventId,
                    user_id: uid,
                    status: 'PENDING',
                })),
            });

            // Send notification to each invited user
            for (const uid of newUserIds) {
                await this.notificationsService.notifyEventInvitation(uid, event.title);
            }
        }

        await this.auditLogsService.log(
            'EVENT_USERS_INVITED',
            'Event',
            eventId,
            invitedBy,
            ipAddress || null,
        );

        return {
            success: true,
            invited_count: newUserIds.length,
            already_invited_count: existingUserIds.size,
        };
    }

    /**
     * Respond to an event invitation (Accept/Reject).
     */
    async respondToInvitation(
        userId: string,
        eventId: string,
        response: RespondToInvitationDto,
        ipAddress?: string | null,
    ) {
        const invitation = await this.db.eventInvitation.findUnique({
            where: {
                event_id_user_id: {
                    event_id: eventId,
                    user_id: userId,
                },
            },
        });

        if (!invitation) {
            throw new NotFoundException('Invitation not found');
        }

        // Rejection requires a reason
        if (response.status === 'REJECTED' && !response.rejection_reason?.trim()) {
            throw new BadRequestException('Rejection reason is required');
        }

        const updated = await this.db.eventInvitation.update({
            where: { id: invitation.id },
            data: {
                status: response.status as InvitationStatus,
                rejection_reason: response.status === 'REJECTED' ? response.rejection_reason : null,
                responded_at: new Date(),
            },
            include: {
                event: { select: { title: true } },
            },
        });

        await this.auditLogsService.log(
            `EVENT_INVITATION_${response.status}`,
            'EventInvitation',
            invitation.id,
            userId,
            ipAddress || null,
        );

        return {
            success: true,
            message: `You have ${response.status.toLowerCase()} the invitation to "${updated.event.title}"`,
            invitation: updated,
        };
    }

    /**
     * Get users available to invite (filtered by role, district, school).
     */
    async getInvitableUsers(filters: {
        role?: UserRole;
        district_id?: string;
        school_id?: string;
        exclude_event_id?: string;
    }) {
        const whereClause: any = {
            is_active: true,
            role: {
                notIn: ['ADMIN', 'SUPER_ADMIN'], // Don't invite admins
            },
        };

        if (filters.role) {
            whereClause.role = filters.role;
        }

        // Build faculty filter
        const facultyFilter: any = {};
        if (filters.school_id) {
            facultyFilter.school_id = filters.school_id;
        } else if (filters.district_id) {
            facultyFilter.school = { district_id: filters.district_id };
        }

        if (Object.keys(facultyFilter).length > 0) {
            whereClause.faculty = facultyFilter;
        }

        const users = await this.db.user.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                faculty: {
                    select: {
                        school: {
                            select: {
                                id: true,
                                name: true,
                                district: { select: { id: true, name: true } },
                            },
                        },
                    },
                },
            },
            orderBy: { name: 'asc' },
        });

        // If excluding already invited users for an event
        if (filters.exclude_event_id) {
            const invitedUserIds = await this.db.eventInvitation.findMany({
                where: { event_id: filters.exclude_event_id },
                select: { user_id: true },
            });
            const invitedSet = new Set(invitedUserIds.map(i => i.user_id));
            return users.filter(u => !invitedSet.has(u.id));
        }

        return users;
    }

    /**
     * Create a school event as headmaster.
     * Automatically sets the school_id from headmaster's faculty record.
     * All teachers in that school will be able to see this event.
     */
    async createSchoolEvent(
        userId: string,
        data: CreateSchoolEventDto,
        ipAddress?: string | null,
    ) {
        if (!data.title || !data.event_date) {
            throw new BadRequestException('Title and event date are required');
        }

        // Get headmaster's school from faculty record
        const user = await this.db.user.findUnique({
            where: { id: userId },
            include: {
                faculty: {
                    select: {
                        school_id: true,
                        school: { select: { district_id: true } },
                    },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (!user.faculty?.school_id) {
            throw new ForbiddenException('You must be associated with a school to create events');
        }

        const schoolId = user.faculty.school_id;
        const districtId = user.faculty.school?.district_id;

        // Use event_type or type (mobile app sends 'type')
        const eventType = data.event_type || data.type || 'OTHER';

        const event = await this.db.event.create({
            data: {
                title: data.title,
                description: data.description,
                event_type: eventType,
                event_date: new Date(data.event_date),
                event_end_date: data.event_end_date ? new Date(data.event_end_date) : null,
                event_time: data.event_time,
                location: data.location,
                activity_type: data.activity_type,
                male_participants: data.male_participants ? parseInt(String(data.male_participants)) : null,
                female_participants: data.female_participants ? parseInt(String(data.female_participants)) : null,
                school_id: schoolId,
                district_id: districtId,
                created_by: userId,
            },
        });

        await this.auditLogsService.log(
            'EVENT_CREATED',
            'Event',
            event.id,
            userId,
            ipAddress || null,
        );

        return this.getEventById(event.id);
    }

    /**
     * Create a school event as headmaster with photo upload.
     * Automatically sets the school_id from headmaster's faculty record.
     * All teachers in that school will be able to see this event.
     * Photos are stored in Appwrite bucket.
     */
    async createSchoolEventWithPhoto(
        userId: string,
        data: CreateSchoolEventDto,
        file?: Express.Multer.File,
        ipAddress?: string | null,
    ) {
        if (!data.title || !data.event_date) {
            throw new BadRequestException('Title and event date are required');
        }

        // Get headmaster's school from faculty record
        const user = await this.db.user.findUnique({
            where: { id: userId },
            include: {
                faculty: {
                    select: {
                        school_id: true,
                        school: { select: { district_id: true } },
                    },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (!user.faculty?.school_id) {
            throw new ForbiddenException('You must be associated with a school to create events');
        }

        const schoolId = user.faculty.school_id;
        const districtId = user.faculty.school?.district_id;

        // Handle photo upload to Appwrite
        let flyerUrl: string | null = null;
        if (file) {
            const appwriteUrl = await this.appwrite.uploadFile(
                file.buffer,
                file.originalname,
                file.mimetype,
            );
            if (appwriteUrl) {
                flyerUrl = appwriteUrl;
            } else {
                // Fallback to local storage
                const uploadDir = path.join(process.cwd(), 'uploads', 'events');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                const fileName = `${uuidv4()}${path.extname(file.originalname)}`;
                const localPath = path.join(uploadDir, fileName);
                fs.writeFileSync(localPath, file.buffer);
                flyerUrl = `/uploads/events/${fileName}`;
            }
        }

        // Use event_type or type (mobile app sends 'type')
        const eventType = data.event_type || data.type || 'OTHER';

        const event = await this.db.event.create({
            data: {
                title: data.title,
                description: data.description,
                event_type: eventType,
                event_date: new Date(data.event_date),
                event_end_date: data.event_end_date ? new Date(data.event_end_date) : null,
                event_time: data.event_time,
                location: data.location,
                activity_type: data.activity_type,
                male_participants: data.male_participants ? parseInt(String(data.male_participants)) : null,
                female_participants: data.female_participants ? parseInt(String(data.female_participants)) : null,
                flyer_url: flyerUrl,
                school_id: schoolId,
                district_id: districtId,
                created_by: userId,
            },
        });

        await this.auditLogsService.log(
            'EVENT_CREATED',
            'Event',
            event.id,
            userId,
            ipAddress || null,
        );

        return this.getEventById(event.id);
    }
}
