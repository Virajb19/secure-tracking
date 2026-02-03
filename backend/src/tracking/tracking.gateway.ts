import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AgentLocationService } from './agent-location.service';
import { LocationUpdateInput, SubscribeTaskInput } from './dto/tracking.dto';
import { UserRole } from '@prisma/client';

/**
 * JWT Payload structure from auth.service.ts
 */
interface JwtPayload {
    sub: string;    // User ID
    phone: string;
    role: UserRole;
}

/**
 * Extended Socket with user data
 */
interface AuthenticatedSocket extends Socket {
    user?: JwtPayload;
}

/**
 * Tracking WebSocket Gateway.
 * Handles real-time location updates from mobile app agents
 * and broadcasts to admin CMS subscribers.
 * 
 * SECURITY:
 * - All connections must provide valid JWT token
 * - Agents can only send updates for tasks assigned to them
 * - Rate limiting: max 1 update per 3 seconds per agent
 * 
 * ROOMS:
 * - task:{taskId} - Admin subscribers watching a specific task
 */
@WebSocketGateway({
    cors: {
        origin: '*', // TODO: Restrict in production
        credentials: true,
    },
    namespace: '/tracking',
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    private readonly logger = new Logger(TrackingGateway.name);

    // Rate limiting: userId -> last update timestamp
    private readonly rateLimiter = new Map<string, number>();

    // Minimum interval between updates (3 seconds)
    private readonly RATE_LIMIT_MS = 3000;

    constructor(
        private readonly jwtService: JwtService,
        private readonly agentLocationService: AgentLocationService,
    ) { }

    /**
     * Handle new WebSocket connection.
     * Validates JWT token from handshake auth or query params.
     */
    async handleConnection(client: AuthenticatedSocket): Promise<void> {
        try {
            // Extract token from handshake
            const token = this.extractToken(client);

            if (!token) {
                this.logger.warn(`Connection rejected: No token provided. Socket ID: ${client.id}`);
                client.emit('error', { message: 'Authentication required' });
                client.disconnect(true);
                return;
            }

            // Verify JWT token
            const payload = await this.verifyToken(token);
            if (!payload) {
                this.logger.warn(`Connection rejected: Invalid token. Socket ID: ${client.id}`);
                client.emit('error', { message: 'Invalid token' });
                client.disconnect(true);
                return;
            }

            // Attach user to socket
            client.user = payload;
            this.logger.log(`Client connected: ${client.id} (User: ${payload.sub}, Role: ${payload.role})`);

        } catch (error) {
            this.logger.error(`Connection error: ${error}`);
            client.emit('error', { message: 'Authentication failed' });
            client.disconnect(true);
        }
    }

    /**
     * Handle WebSocket disconnection.
     */
    handleDisconnect(client: AuthenticatedSocket): void {
        if (client.user) {
            this.logger.log(`Client disconnected: ${client.id} (User: ${client.user.sub})`);
            // Clear rate limiter entry
            this.rateLimiter.delete(client.user.sub);
        } else {
            this.logger.log(`Unauthenticated client disconnected: ${client.id}`);
        }
    }

    /**
     * Handle location update from mobile app agent.
     * 
     * @event agent:location
     * @param client - Authenticated socket
     * @param payload - Location update data
     */
    @SubscribeMessage('agent:location')
    async handleAgentLocation(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() payload: LocationUpdateInput,
    ): Promise<{ success: boolean; error?: string }> {
        // Verify authenticated
        if (!client.user) {
            return { success: false, error: 'Not authenticated' };
        }

        const userId = client.user.sub;

        // Only SEBA_OFFICER can send location updates
        if (client.user.role !== UserRole.SEBA_OFFICER) {
            this.logger.warn(`Non-agent user ${userId} attempted to send location`);
            return { success: false, error: 'Only delivery agents can send location updates' };
        }

        // Rate limiting
        if (!this.checkRateLimit(userId)) {
            return { success: false, error: 'Rate limited. Wait 3 seconds between updates.' };
        }

        // Validate task assignment
        const validation = await this.agentLocationService.validateAgentTaskAssignment(
            userId,
            payload.task_id,
        );

        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // Store location
        await this.agentLocationService.updateCurrentLocation(
            userId,
            payload.task_id,
            {
                latitude: payload.latitude,
                longitude: payload.longitude,
                accuracy: payload.accuracy,
                heading: payload.heading,
                speed: payload.speed,
                recorded_at: payload.recorded_at,
            },
            validation.storeHistory,
        );

        // Broadcast to admin subscribers
        this.server.to(`task:${payload.task_id}`).emit('location:update', {
            task_id: payload.task_id,
            agent_id: userId,
            latitude: payload.latitude,
            longitude: payload.longitude,
            heading: payload.heading,
            speed: payload.speed,
            timestamp: new Date().toISOString(),
        });

        return { success: true };
    }

    /**
     * Handle admin subscription to task tracking.
     * 
     * @event subscribe:task
     * @param client - Authenticated socket
     * @param payload - Task subscription request
     */
    @SubscribeMessage('subscribe:task')
    async handleSubscribeTask(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() payload: SubscribeTaskInput,
    ): Promise<{ success: boolean; current_location?: any; error?: string }> {
        // Verify authenticated
        if (!client.user) {
            return { success: false, error: 'Not authenticated' };
        }

        // Only ADMIN/SUPER_ADMIN can subscribe to tracking
        if (client.user.role !== UserRole.ADMIN && client.user.role !== UserRole.SUPER_ADMIN) {
            return { success: false, error: 'Only admins can subscribe to task tracking' };
        }

        // Join task room
        client.join(`task:${payload.task_id}`);
        this.logger.log(`Admin ${client.user.sub} subscribed to task:${payload.task_id}`);

        // Return current location if available
        const currentLocation = await this.agentLocationService.getCurrentLocationByTask(payload.task_id);

        return {
            success: true,
            current_location: currentLocation ? {
                agent_id: currentLocation.user_id,
                agent_name: currentLocation.user?.name,
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                heading: currentLocation.heading,
                speed: currentLocation.speed,
                updated_at: currentLocation.updated_at,
            } : null,
        };
    }

    /**
     * Handle admin unsubscription from task tracking.
     * 
     * @event unsubscribe:task
     * @param client - Authenticated socket
     * @param payload - Task subscription request
     */
    @SubscribeMessage('unsubscribe:task')
    async handleUnsubscribeTask(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() payload: SubscribeTaskInput,
    ): Promise<{ success: boolean }> {
        client.leave(`task:${payload.task_id}`);
        this.logger.log(`Client ${client.id} unsubscribed from task:${payload.task_id}`);
        return { success: true };
    }

    // ==================== PRIVATE HELPERS ====================

    /**
     * Extract JWT token from socket handshake.
     * Supports: Authorization header, auth.token, or query.token
     */
    private extractToken(client: Socket): string | null {
        // Try Authorization header
        const authHeader = client.handshake.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        // Try auth object
        const authToken = client.handshake.auth?.token;
        if (authToken) {
            return authToken;
        }

        // Try query params
        const queryToken = client.handshake.query?.token;
        if (typeof queryToken === 'string') {
            return queryToken;
        }

        return null;
    }

    /**
     * Verify JWT token and return payload.
     */
    private async verifyToken(token: string): Promise<JwtPayload | null> {
        try {
            return this.jwtService.verify<JwtPayload>(token);
        } catch {
            return null;
        }
    }

    /**
     * Check rate limit for user.
     * Returns true if user can send an update.
     */
    private checkRateLimit(userId: string): boolean {
        const lastUpdate = this.rateLimiter.get(userId) || 0;
        const now = Date.now();

        if (now - lastUpdate < this.RATE_LIMIT_MS) {
            return false;
        }

        this.rateLimiter.set(userId, now);
        return true;
    }
}
