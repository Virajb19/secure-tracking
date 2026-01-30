import {
    Controller,
    Get,
    Post,
    Delete,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles, CurrentUser } from '../shared/decorators';
import { HelpdeskService } from './helpdesk.service';
import { CreateHelpdeskDto } from './dto';

@Controller('helpdesk')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HelpdeskController {
    constructor(private readonly helpdeskService: HelpdeskService) {}

    /**
     * POST /helpdesk
     * Create a new helpdesk ticket.
     * Any authenticated user can create a ticket.
     */
    @Post()
    @Roles(
        UserRole.TEACHER,
        UserRole.HEADMASTER,
        UserRole.CENTER_SUPERINTENDENT,
        UserRole.SEBA_OFFICER,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
    )
    async createTicket(
        @CurrentUser() user: User,
        @Body() dto: CreateHelpdeskDto,
    ) {
        return this.helpdeskService.createTicket(user, dto);
    }

    /**
     * GET /helpdesk
     * Get all helpdesk tickets with pagination (Admin only).
     */
    @Get()
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async getAllTickets(
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Query('status') status?: string,
    ) {
        return this.helpdeskService.getAllTickets(
            limit ? parseInt(limit, 10) : 20,
            offset ? parseInt(offset, 10) : 0,
            status,
        );
    }

    /**
     * GET /helpdesk/my-tickets
     * Get the current user's tickets.
     */
    @Get('my-tickets')
    @Roles(
        UserRole.TEACHER,
        UserRole.HEADMASTER,
        UserRole.CENTER_SUPERINTENDENT,
        UserRole.SEBA_OFFICER,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
    )
    async getMyTickets(@CurrentUser() user: User) {
        return this.helpdeskService.getUserTickets(user.id);
    }

    /**
     * DELETE /helpdesk/:id
     * Delete a helpdesk ticket (Admin only).
     */
    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async deleteTicket(@Param('id') ticketId: string) {
        return this.helpdeskService.deleteTicket(ticketId);
    }

    /**
     * PATCH /helpdesk/:id/resolve
     * Mark a ticket as resolved (Admin only).
     */
    @Patch(':id/resolve')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async resolveTicket(@Param('id') ticketId: string) {
        return this.helpdeskService.resolveTicket(ticketId);
    }

    /**
     * PATCH /helpdesk/:id/toggle-status
     * Toggle ticket status between resolved and pending (Admin only).
     */
    @Patch(':id/toggle-status')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async toggleStatus(@Param('id') ticketId: string) {
        return this.helpdeskService.toggleStatus(ticketId);
    }
}
