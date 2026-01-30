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
     * Get all helpdesk tickets with pagination (Admin only).
     * Returns tickets sorted by creation date (newest first).
     */
    async getAllTickets(limit = 20, offset = 0, status?: string) {
        const where: any = {};
        
        if (status === 'pending') {
            where.is_resolved = false;
        } else if (status === 'resolved') {
            where.is_resolved = true;
        }

        const [data, total] = await Promise.all([
            this.db.helpdesk.findMany({
                where,
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
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
            }),
            this.db.helpdesk.count({ where }),
        ]);

        return {
            data,
            total,
            hasMore: offset + data.length < total,
        };
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

    /**
     * Toggle ticket status between resolved and pending (Admin only).
     */
    async toggleStatus(ticketId: string) {
        const ticket = await this.db.helpdesk.findUnique({
            where: { id: ticketId },
        });

        if (!ticket) {
            throw new NotFoundException('Ticket not found');
        }

        return this.db.helpdesk.update({
            where: { id: ticketId },
            data: { is_resolved: !ticket.is_resolved },
        });
    }
}
