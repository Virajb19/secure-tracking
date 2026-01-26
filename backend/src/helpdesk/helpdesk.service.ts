import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateHelpdeskDto } from './dto';
import { User } from '@prisma/client';

@Injectable()
export class HelpdeskService {
    constructor(private readonly db: PrismaService) {}

    /**
     * Create a new helpdesk ticket.
     * Uses the logged-in user's name and phone.
     */
    async createTicket(user: User, dto: CreateHelpdeskDto) {
        const ticket = await this.db.helpdesk.create({
            data: {
                user_id: user.id,
                full_name: user.name,
                phone: user.phone,
                message: dto.message,
            },
            include: {
                user: {
                    select: {
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
            },
        });

        return ticket;
    }

    /**
     * Get all helpdesk tickets (Admin only).
     * Returns tickets sorted by creation date (newest first).
     */
    async getAllTickets() {
        return this.db.helpdesk.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                user: {
                    select: {
                        name: true,
                        phone: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
    }

    /**
     * Get user's own helpdesk tickets.
     */
    async getUserTickets(userId: string) {
        return this.db.helpdesk.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
        });
    }

    /**
     * Delete a helpdesk ticket (Admin only).
     */
    async deleteTicket(ticketId: string) {
        const ticket = await this.db.helpdesk.findUnique({
            where: { id: ticketId },
        });

        if (!ticket) {
            throw new NotFoundException('Ticket not found');
        }

        await this.db.helpdesk.delete({
            where: { id: ticketId },
        });

        return { message: 'Ticket deleted successfully' };
    }

    /**
     * Mark a ticket as resolved (Admin only).
     */
    async resolveTicket(ticketId: string) {
        const ticket = await this.db.helpdesk.findUnique({
            where: { id: ticketId },
        });

        if (!ticket) {
            throw new NotFoundException('Ticket not found');
        }

        return this.db.helpdesk.update({
            where: { id: ticketId },
            data: { is_resolved: true },
        });
    }
}
