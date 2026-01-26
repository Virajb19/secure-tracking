import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import * as admin from 'firebase-admin';

/**
 * Expo Push API URL
 */
const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Notification types for categorization
 */
export enum NotificationType {
    ACCOUNT_ACTIVATED = 'ACCOUNT_ACTIVATED',
    ACCOUNT_DEACTIVATED = 'ACCOUNT_DEACTIVATED',
    PROFILE_APPROVED = 'PROFILE_APPROVED',
    PROFILE_REJECTED = 'PROFILE_REJECTED',
    NEW_CIRCULAR = 'NEW_CIRCULAR',
    NEW_EVENT = 'NEW_EVENT',
    NEW_NOTICE = 'NEW_NOTICE',
    TASK_ASSIGNED = 'TASK_ASSIGNED',
    HELPDESK_REPLY = 'HELPDESK_REPLY',
    GENERAL = 'GENERAL',
    // Paper Setter related
    PAPER_SETTER_INVITE = 'PAPER_SETTER_INVITE',
    PAPER_SETTER_ACCEPTED = 'PAPER_SETTER_ACCEPTED',
    // Form submission related
    FORM_APPROVAL = 'FORM_APPROVAL',
    FORM_REJECTION = 'FORM_REJECTION',
}

/**
 * Payload for sending notification
 */
export interface SendNotificationPayload {
    userId: string;
    title: string;
    body: string;
    type: NotificationType;
    data?: Record<string, string>;
}

/**
 * NotificationService
 * 
 * Handles push notifications via Firebase Cloud Messaging (FCM) for native tokens
 * and Expo Push API for Expo push tokens.
 * Also stores notification history in database.
 */
@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);
    private firebaseApp: admin.app.App | null = null;

    constructor(private readonly db: PrismaService) {
        this.initializeFirebase();
    }

    /**
     * Initialize Firebase Admin SDK using environment variables
     */
    private initializeFirebase() {
        try {
            // Check if Firebase is already initialized
            if (admin.apps.length > 0) {
                this.firebaseApp = admin.apps[0]!;
                this.logger.log('Firebase Admin already initialized');
                return;
            }

            // Get Firebase credentials from environment variables
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'); // Handle escaped newlines

            if (!projectId || !clientEmail || !privateKey) {
                this.logger.warn('Firebase credentials not found in environment variables');
                this.logger.warn('FCM push notifications will be disabled, Expo Push will still work');
                return;
            }

            this.firebaseApp = admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });

            this.logger.log('🔥 Firebase Admin SDK initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Firebase Admin SDK:', error);
            this.logger.warn('FCM push notifications will be disabled, Expo Push will still work');
        }
    }

    /**
     * Check if a token is an Expo push token
     */
    private isExpoPushToken(token: string): boolean {
        return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
    }

    /**
     * Save push token for a user
     */
    async savePushToken(userId: string, pushToken: string): Promise<void> {
        await this.db.user.update({
            where: { id: userId },
            data: { push_token: pushToken },
        });
        const tokenType = this.isExpoPushToken(pushToken) ? 'Expo' : 'FCM';
        this.logger.log(`${tokenType} push token saved for user ${userId}`);
    }

    /**
     * Remove push token for a user (on logout)
     */
    async removePushToken(userId: string): Promise<void> {
        await this.db.user.update({
            where: { id: userId },
            data: { push_token: null },
        });
        this.logger.log(`Push token removed for user ${userId}`);
    }

    /**
     * Send notification via Expo Push API
     */
    private async sendViaExpoPush(
        pushToken: string,
        title: string,
        body: string,
        type: string,
        data?: Record<string, string>,
    ): Promise<boolean> {
        try {
            const message = {
                to: pushToken,
                sound: 'default',
                title,
                body,
                data: {
                    type,
                    ...data,
                },
            };

            const response = await fetch(EXPO_PUSH_API_URL, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(message),
            });

            const result = await response.json();
            
            if (result.data?.status === 'ok') {
                this.logger.log(`✅ Expo push notification sent successfully`);
                return true;
            } else {
                this.logger.warn(`Expo push failed:`, result);
                return false;
            }
        } catch (error: any) {
            this.logger.error(`Expo push error:`, error.message);
            return false;
        }
    }

    /**
     * Send notification via FCM
     */
    private async sendViaFCM(
        pushToken: string,
        title: string,
        body: string,
        type: string,
        data?: Record<string, string>,
    ): Promise<boolean> {
        if (!this.firebaseApp) {
            this.logger.warn('Firebase not initialized, cannot send FCM notification');
            return false;
        }

        const message: admin.messaging.Message = {
            token: pushToken,
            notification: {
                title,
                body,
            },
            data: {
                type,
                ...data,
            },
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'default',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    },
                },
            },
        };

        await admin.messaging().send(message);
        this.logger.log(`✅ FCM push notification sent successfully`);
        return true;
    }

    /**
     * Send notification to a single user
     * Automatically detects token type (Expo or FCM) and routes accordingly
     */
    async sendToUser(payload: SendNotificationPayload): Promise<boolean> {
        const { userId, title, body, type, data } = payload;

        try {
            // Get user's push token
            const user = await this.db.user.findUnique({
                where: { id: userId },
                select: { push_token: true, name: true },
            });

            // Save to notification log (even if push fails)
            await this.db.notificationLog.create({
                data: {
                    user_id: userId,
                    title,
                    body,
                    type,
                    is_read: false,
                },
            });

            // If no push token, just log and return
            if (!user?.push_token) {
                this.logger.warn(`No push token for user ${userId}, notification saved to DB only`);
                return false;
            }

            // Route to appropriate push service based on token type
            let success = false;
            if (this.isExpoPushToken(user.push_token)) {
                this.logger.debug(`Sending via Expo Push to ${user.name}`);
                success = await this.sendViaExpoPush(user.push_token, title, body, type, data);
            } else {
                this.logger.debug(`Sending via FCM to ${user.name}`);
                success = await this.sendViaFCM(user.push_token, title, body, type, data);
            }

            if (success) {
                this.logger.log(`✅ Push notification sent to ${user.name} (${userId})`);
            }
            return success;
        } catch (error: any) {
            this.logger.error(`Failed to send notification to ${userId}:`, error.message);
            
            // If token is invalid, remove it
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
                await this.removePushToken(userId);
            }
            
            return false;
        }
    }

    /**
     * Send notification to multiple users
     */
    async sendToUsers(
        userIds: string[],
        title: string,
        body: string,
        type: NotificationType,
        data?: Record<string, string>,
    ): Promise<{ success: number; failed: number }> {
        let success = 0;
        let failed = 0;

        for (const userId of userIds) {
            const result = await this.sendToUser({ userId, title, body, type, data });
            if (result) success++;
            else failed++;
        }

        this.logger.log(`Batch notification: ${success} sent, ${failed} failed`);
        return { success, failed };
    }

    /**
     * Send notification to users by role
     */
    async sendToRole(
        role: string,
        title: string,
        body: string,
        type: NotificationType,
        data?: Record<string, string>,
    ): Promise<{ success: number; failed: number }> {
        const users = await this.db.user.findMany({
            where: { role: role as any, is_active: true },
            select: { id: true },
        });

        return this.sendToUsers(
            users.map(u => u.id),
            title,
            body,
            type,
            data,
        );
    }

    /**
     * Send notification to users of a specific school
     */
    async sendToSchool(
        schoolId: string,
        title: string,
        body: string,
        type: NotificationType,
        data?: Record<string, string>,
    ): Promise<{ success: number; failed: number }> {
        const faculties = await this.db.faculty.findMany({
            where: { school_id: schoolId },
            select: { user_id: true },
        });

        return this.sendToUsers(
            faculties.map(f => f.user_id),
            title,
            body,
            type,
            data,
        );
    }

    /**
     * Send notification to users of a specific district
     */
    async sendToDistrict(
        districtId: string,
        title: string,
        body: string,
        type: NotificationType,
        data?: Record<string, string>,
    ): Promise<{ success: number; failed: number }> {
        const schools = await this.db.school.findMany({
            where: { district_id: districtId },
            select: { id: true },
        });

        let totalSuccess = 0;
        let totalFailed = 0;

        for (const school of schools) {
            const result = await this.sendToSchool(school.id, title, body, type, data);
            totalSuccess += result.success;
            totalFailed += result.failed;
        }

        return { success: totalSuccess, failed: totalFailed };
    }

    /**
     * Get notification history for a user
     */
    async getUserNotifications(
        userId: string,
        page: number = 1,
        limit: number = 20,
    ) {
        const skip = (page - 1) * limit;

        const [notifications, total] = await Promise.all([
            this.db.notificationLog.findMany({
                where: { user_id: userId },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
            }),
            this.db.notificationLog.count({
                where: { user_id: userId },
            }),
        ]);

        return {
            notifications,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string, userId: string): Promise<void> {
        await this.db.notificationLog.updateMany({
            where: { id: notificationId, user_id: userId },
            data: { is_read: true },
        });
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string): Promise<void> {
        await this.db.notificationLog.updateMany({
            where: { user_id: userId, is_read: false },
            data: { is_read: true },
        });
    }

    /**
     * Get unread notification count
     */
    async getUnreadCount(userId: string): Promise<number> {
        return this.db.notificationLog.count({
            where: { user_id: userId, is_read: false },
        });
    }

    // =============================================
    // CONVENIENCE METHODS FOR SPECIFIC NOTIFICATIONS
    // =============================================

    /**
     * Notify user when account is activated
     */
    async notifyAccountActivated(userId: string): Promise<void> {
        await this.sendToUser({
            userId,
            title: '✅ Account Activated',
            body: 'Your account has been activated. You can now login to the app.',
            type: NotificationType.ACCOUNT_ACTIVATED,
        });
    }

    /**
     * Notify user when account is deactivated
     */
    async notifyAccountDeactivated(userId: string): Promise<void> {
        await this.sendToUser({
            userId,
            title: '⚠️ Account Deactivated',
            body: 'Your account has been deactivated. Please contact admin for assistance.',
            type: NotificationType.ACCOUNT_DEACTIVATED,
        });
    }

    /**
     * Notify user when profile is approved
     */
    async notifyProfileApproved(userId: string): Promise<void> {
        await this.sendToUser({
            userId,
            title: '✅ Profile Approved',
            body: 'Congratulations! Your profile has been approved by SEBA.',
            type: NotificationType.PROFILE_APPROVED,
        });
    }

    /**
     * Notify user when profile is rejected
     */
    async notifyProfileRejected(userId: string, reason?: string): Promise<void> {
        await this.sendToUser({
            userId,
            title: '❌ Profile Rejected',
            body: reason 
                ? `Your profile was rejected. Reason: ${reason}`
                : 'Your profile was rejected. Please contact admin for more details.',
            type: NotificationType.PROFILE_REJECTED,
        });
    }

    /**
     * Notify users about new circular
     */
    async notifyNewCircular(
        circularTitle: string,
        districtId?: string,
        schoolId?: string,
    ): Promise<void> {
        const title = '📄 New Circular';
        const body = `New circular published: ${circularTitle}`;
        const type = NotificationType.NEW_CIRCULAR;

        if (schoolId) {
            await this.sendToSchool(schoolId, title, body, type);
        } else if (districtId) {
            await this.sendToDistrict(districtId, title, body, type);
        } else {
            // Send to all teachers/headmasters
            await this.sendToRole('TEACHER', title, body, type);
            await this.sendToRole('HEADMASTER', title, body, type);
        }
    }

    /**
     * Notify user about event invitation
     */
    async notifyEventInvitation(userId: string, eventTitle: string): Promise<void> {
        await this.sendToUser({
            userId,
            title: '📅 Event Invitation',
            body: `You're invited to: ${eventTitle}`,
            type: NotificationType.NEW_EVENT,
        });
    }

    /**
     * Notify school about new notice
     */
    async notifyNewNotice(schoolId: string, noticeTitle: string): Promise<void> {
        await this.sendToSchool(
            schoolId,
            '📢 New Notice',
            `New notice: ${noticeTitle}`,
            NotificationType.NEW_NOTICE,
        );
    }

    /**
     * Notify user about task assignment
     */
    async notifyTaskAssigned(userId: string, sealedPackCode: string): Promise<void> {
        await this.sendToUser({
            userId,
            title: '📦 New Task Assigned',
            body: `New delivery task assigned: ${sealedPackCode}`,
            type: NotificationType.TASK_ASSIGNED,
        });
    }

    /**
     * Notify user about helpdesk ticket reply
     */
    async notifyHelpdeskReply(userId: string): Promise<void> {
        await this.sendToUser({
            userId,
            title: '💬 Helpdesk Update',
            body: 'Your helpdesk ticket has been updated.',
            type: NotificationType.HELPDESK_REPLY,
        });
    }
}
