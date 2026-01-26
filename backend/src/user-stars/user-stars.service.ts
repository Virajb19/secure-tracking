import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';

/**
 * User Stars Service
 * 
 * Handles admin bookmarking/starring of users.
 */
@Injectable()
export class UserStarsService {
    constructor(private readonly db: PrismaService) {}

    /**
     * Toggle star status for a user
     */
    async toggleStar(adminId: string, userId: string): Promise<{ starred: boolean }> {
        const existing = await this.db.userStar.findUnique({
            where: {
                admin_id_starred_user_id: {
                    admin_id: adminId,
                    starred_user_id: userId,
                },
            },
        });

        if (existing) {
            await this.db.userStar.delete({
                where: { id: existing.id },
            });
            return { starred: false };
        } else {
            await this.db.userStar.create({
                data: {
                    admin_id: adminId,
                    starred_user_id: userId,
                },
            });
            return { starred: true };
        }
    }

    /**
     * Get all starred users for an admin
     */
    async getStarredUsers(adminId: string) {
        return this.db.userStar.findMany({
            where: { admin_id: adminId },
            include: {
                starred_user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                        role: true,
                        is_active: true,
                        faculty: {
                            select: {
                                school: {
                                    select: { name: true },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });
    }

    /**
     * Get starred user IDs for an admin
     */
    async getStarredUserIds(adminId: string): Promise<string[]> {
        const stars = await this.db.userStar.findMany({
            where: { admin_id: adminId },
            select: { starred_user_id: true },
        });
        return stars.map(s => s.starred_user_id);
    }

    /**
     * Check if a user is starred
     */
    async isStarred(adminId: string, userId: string): Promise<boolean> {
        const count = await this.db.userStar.count({
            where: {
                admin_id: adminId,
                starred_user_id: userId,
            },
        });
        return count > 0;
    }
}
