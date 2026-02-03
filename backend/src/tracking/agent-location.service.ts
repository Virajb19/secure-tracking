import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { TaskStatus } from '@prisma/client';

/**
 * Agent Location Service.
 * Handles storage and retrieval of agent locations for live tracking.
 * 
 * ARCHITECTURE:
 * - AgentCurrentLocation: Upserted on every update (single row per agent)
 * - AgentLocationHistory: Only stored when explicitly required (audit mode)
 */
@Injectable()
export class AgentLocationService {
    private readonly logger = new Logger(AgentLocationService.name);

    constructor(private readonly db: PrismaService) { }

    /**
     * Update agent's current location (upsert).
     * This overwrites the previous location for real-time map rendering.
     * 
     * @param userId - Agent's user ID
     * @param taskId - Current task ID
     * @param location - Location data
     * @param storeHistory - If true, also store in history table
     */
    async updateCurrentLocation(
        userId: string,
        taskId: string,
        location: {
            latitude: number;
            longitude: number;
            accuracy?: number;
            heading?: number;
            speed?: number;
            recorded_at: string;
        },
        storeHistory: boolean = false,
    ): Promise<void> {
        // Upsert current location (one row per agent)
        await this.db.agentCurrentLocation.upsert({
            where: { user_id: userId },
            create: {
                user_id: userId,
                task_id: taskId,
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy,
                heading: location.heading,
                speed: location.speed,
                updated_at: new Date(),
            },
            update: {
                task_id: taskId,
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy,
                heading: location.heading,
                speed: location.speed,
                updated_at: new Date(),
            },
        });

        // Optionally store in history for audit trail
        if (storeHistory) {
            await this.db.agentLocationHistory.create({
                data: {
                    user_id: userId,
                    task_id: taskId,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    accuracy: location.accuracy,
                    heading: location.heading,
                    speed: location.speed,
                    recorded_at: new Date(location.recorded_at),
                },
            });
        }
    }

    /**
     * Get current location of an agent.
     * 
     * @param userId - Agent's user ID
     * @returns Current location or null
     */
    async getCurrentLocation(userId: string) {
        return this.db.agentCurrentLocation.findUnique({
            where: { user_id: userId },
        });
    }

    /**
     * Get current location for a specific task (find agent assigned to task).
     * 
     * @param taskId - Task ID
     * @returns Current location of the assigned agent or null
     */
    async getCurrentLocationByTask(taskId: string) {
        return this.db.agentCurrentLocation.findFirst({
            where: { task_id: taskId },
            include: {
                user: {
                    select: { id: true, name: true, phone: true },
                },
            },
        });
    }

    /**
     * Validate that agent is assigned to task and task is active.
     * 
     * @param userId - Agent's user ID
     * @param taskId - Task ID
     * @returns Validation result with error message if invalid
     */
    async validateAgentTaskAssignment(
        userId: string,
        taskId: string,
    ): Promise<{ valid: boolean; error?: string; storeHistory?: boolean }> {
        const task = await this.db.task.findUnique({
            where: { id: taskId },
            select: {
                id: true,
                assigned_user_id: true,
                status: true,
                start_time: true,
                end_time: true,
            },
        });

        if (!task) {
            return { valid: false, error: 'Task not found' };
        }

        if (task.assigned_user_id !== userId) {
            this.logger.warn(`User ${userId} attempted to update location for task ${taskId} not assigned to them`);
            return { valid: false, error: 'Not assigned to this task' };
        }

        // Task must be PENDING or IN_PROGRESS
        if (task.status !== TaskStatus.PENDING && task.status !== TaskStatus.IN_PROGRESS) {
            return { valid: false, error: 'Task is not active' };
        }

        // Check time window (optional - can be relaxed)
        const now = new Date();
        if (now < task.start_time) {
            return { valid: false, error: 'Task has not started yet' };
        }

        // Store history for suspicious tasks or when close to end time
        // Note: status.SUSPICIOUS tasks were already filtered out above, but this handles edge cases
        const storeHistory = task.end_time && now > new Date(task.end_time.getTime() - 15 * 60 * 1000); // Last 15 minutes

        return { valid: true, storeHistory };
    }

    /**
     * Clear agent's current location when task is completed.
     * 
     * @param userId - Agent's user ID
     */
    async clearCurrentLocation(userId: string): Promise<void> {
        try {
            await this.db.agentCurrentLocation.delete({
                where: { user_id: userId },
            });
        } catch {
            // Ignore if not found
        }
    }

    /**
     * Get location history for a task (for audit/analytics).
     * 
     * @param taskId - Task ID
     * @param limit - Maximum number of records to return
     */
    async getLocationHistory(taskId: string, limit: number = 100) {
        return this.db.agentLocationHistory.findMany({
            where: { task_id: taskId },
            orderBy: { recorded_at: 'asc' },
            take: limit,
        });
    }
}
