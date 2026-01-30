import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Ip,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { User, UserRole, SchoolEventType } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles, CurrentUser } from '../shared/decorators';
import { EventsService, CreateEventDto, UpdateEventDto, RespondToInvitationDto, CreateSchoolEventDto, EventFilterDto } from './events.service';

/**
 * Admin Events Controller.
 * Handles event management for ADMIN/SUPER_ADMIN users.
 */
@Controller('admin/events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminEventsController {
    constructor(private readonly eventsService: EventsService) {}

    /**
     * GET /admin/events
     * Get all events with invitation stats (Admin only).
     * Supports filtering by date range, district, event type, and pagination.
     */
    @Get()
    async getAllEvents(
        @Query('from_date') fromDate?: string,
        @Query('to_date') toDate?: string,
        @Query('district_id') districtId?: string,
        @Query('event_type') eventType?: SchoolEventType,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const filters: EventFilterDto = {
            from_date: fromDate,
            to_date: toDate,
            district_id: districtId,
            event_type: eventType,
        };
        return this.eventsService.getAllEventsAdmin(
            filters,
            limit ? parseInt(limit, 10) : 20,
            offset ? parseInt(offset, 10) : 0,
        );
    }

    /**
     * GET /admin/events/invitable-users
     * Get users available to invite (filtered).
     * NOTE: This must be defined BEFORE :id route to avoid conflict.
     */
    @Get('invitable-users')
    async getInvitableUsers(
        @Query('role') role?: UserRole,
        @Query('district_id') districtId?: string,
        @Query('school_id') schoolId?: string,
        @Query('exclude_event_id') excludeEventId?: string,
    ) {
        return this.eventsService.getInvitableUsers({
            role,
            district_id: districtId,
            school_id: schoolId,
            exclude_event_id: excludeEventId,
        });
    }

    /**
     * GET /admin/events/:id
     * Get single event with full details including invitations.
     */
    @Get(':id')
    async getEventById(@Param('id') eventId: string) {
        return this.eventsService.getEventById(eventId);
    }

    /**
     * POST /admin/events
     * Create a new event with optional flyer upload.
     */
    @Post()
    @UseInterceptors(FileInterceptor('flyer'))
    async createEvent(
        @CurrentUser() user: User,
        @Body() body: CreateEventDto,
        @UploadedFile() file: Express.Multer.File | undefined,
        @Ip() ip: string | null,
    ) {
        // Parse invited_user_ids if it's a string (from FormData)
        let invitedUserIds = body.invited_user_ids;
        if (typeof invitedUserIds === 'string') {
            try {
                invitedUserIds = JSON.parse(invitedUserIds);
            } catch {
                invitedUserIds = [];
            }
        }
        return this.eventsService.createEvent(
            user.id,
            { ...body, invited_user_ids: invitedUserIds },
            file,
            ip,
        );
    }

    /**
     * PATCH /admin/events/:id
     * Update an event.
     */
    @Patch(':id')
    @UseInterceptors(FileInterceptor('flyer'))
    async updateEvent(
        @CurrentUser() user: User,
        @Param('id') eventId: string,
        @Body() body: UpdateEventDto,
        @UploadedFile() file: Express.Multer.File | undefined,
        @Ip() ip: string | null,
    ) {
        return this.eventsService.updateEvent(user.id, eventId, body, file, ip);
    }

    /**
     * DELETE /admin/events/:id
     * Soft delete an event.
     */
    @Delete(':id')
    async deleteEvent(
        @CurrentUser() user: User,
        @Param('id') eventId: string,
        @Ip() ip: string | null,
    ) {
        return this.eventsService.deleteEvent(user.id, eventId, ip);
    }

    /**
     * POST /admin/events/:id/invite
     * Invite users to an event.
     */
    @Post(':id/invite')
    async inviteUsers(
        @CurrentUser() user: User,
        @Param('id') eventId: string,
        @Body() body: { user_ids: string[] },
        @Ip() ip: string | null,
    ) {
        return this.eventsService.inviteUsersToEvent(eventId, body.user_ids, user.id, ip);
    }
}

/**
 * User Events Controller.
 * Handles event viewing and participation for all users.
 */
@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
    constructor(private readonly eventsService: EventsService) {}

    /**
     * GET /events
     * Get events for the current user (invited + visible events).
     */
    @Get()
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SEBA_OFFICER, UserRole.HEADMASTER, UserRole.TEACHER, UserRole.CENTER_SUPERINTENDENT)
    async getMyEvents(@CurrentUser() user: User) {
        return this.eventsService.getEventsForUser(user.id);
    }

    /**
     * POST /events
     * Create a school event (Headmaster only) with optional photo upload.
     * The school_id is automatically set from the headmaster's faculty record.
     * All teachers in the same school will be able to see this event.
     */
    @Post()
    @Roles(UserRole.HEADMASTER)
    @UseInterceptors(FileInterceptor('photo'))
    async createSchoolEvent(
        @CurrentUser() user: User,
        @Body() body: CreateSchoolEventDto,
        @UploadedFile() file: Express.Multer.File | undefined,
        @Ip() ip: string | null,
    ) {
        return this.eventsService.createSchoolEventWithPhoto(user.id, body, file, ip);
    }

    /**
     * GET /events/:id
     * Get single event details.
     */
    @Get(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SEBA_OFFICER, UserRole.HEADMASTER, UserRole.TEACHER, UserRole.CENTER_SUPERINTENDENT)
    async getEventById(@Param('id') eventId: string) {
        return this.eventsService.getEventById(eventId);
    }

    /**
     * POST /events/:id/respond
     * Respond to an event invitation (Accept/Reject).
     */
    @Post(':id/respond')
    @Roles(UserRole.SEBA_OFFICER, UserRole.HEADMASTER, UserRole.TEACHER, UserRole.CENTER_SUPERINTENDENT)
    async respondToInvitation(
        @CurrentUser() user: User,
        @Param('id') eventId: string,
        @Body() body: RespondToInvitationDto,
        @Ip() ip: string | null,
    ) {
        return this.eventsService.respondToInvitation(user.id, eventId, body, ip);
    }
}
