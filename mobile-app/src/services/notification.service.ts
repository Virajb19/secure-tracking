/**
 * Notification Service
 * 
 * Handles push notification registration, permissions, and API calls.
 * Uses Expo Notifications with Expo Push Tokens for Expo Go compatibility.
 * 
 * Note: For Expo Go, we use Expo Push Tokens. The backend will detect
 * the token type and route to Expo Push API or FCM accordingly.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_CONFIG } from '../constants/config';
import { getSecureItem } from '../utils/storage';
import { STORAGE_KEYS } from '../constants/config';
// Firebase disabled - not configured
// import '../lib/firebase';

/**
 * Notification response from server
 */
export interface NotificationItem {
    id: string;
    user_id: string;
    title: string;
    body: string;
    type: string | null;
    is_read: boolean;
    created_at: string;
}

export interface NotificationsResponse {
    notifications: NotificationItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/**
 * Configure notification handler
 * This determines how notifications behave when app is in foreground
 */
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
        console.log('[Notifications] Must use physical device for push notifications');
        return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('[Notifications] Permission not granted');
        return false;
    }

    return true;
}

/**
 * Get Expo push token for this device
 * This works with Expo Go and the backend will route to Expo Push API
 */
export async function getExpoPushToken(): Promise<string | null> {
    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
            return null;
        }

        // Set up Android notification channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#4f8cff',
            });
        }

        // Get project ID from Expo config
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        
        // Get Expo push token
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId,
        });

        console.log('[Notifications] Expo Push Token:', tokenData.data);
        return tokenData.data;
    } catch (error) {
        console.error('[Notifications] Error getting Expo push token:', error);
        return null;
    }
}

/**
 * Alias for getExpoPushToken (for compatibility)
 */
export const getFCMToken = getExpoPushToken;

/**
 * Register push token with backend
 */
export async function registerPushToken(pushToken: string): Promise<boolean> {
    try {
        const token = await getSecureItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (!token) {
            console.log('[Notifications] No auth token, cannot register push token');
            return false;
        }

        const response = await fetch(`${API_CONFIG.BASE_URL}/notifications/push-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ push_token: pushToken }),
        });

        if (response.ok) {
            console.log('[Notifications] Push token registered successfully');
            return true;
        }

        console.error('[Notifications] Failed to register push token:', response.status);
        return false;
    } catch (error) {
        console.error('[Notifications] Error registering push token:', error);
        return false;
    }
}

/**
 * Remove push token from backend (on logout)
 */
export async function removePushToken(): Promise<boolean> {
    try {
        const token = await getSecureItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (!token) {
            return true; // Already logged out
        }

        const response = await fetch(`${API_CONFIG.BASE_URL}/notifications/push-token/remove`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        return response.ok;
    } catch (error) {
        console.error('[Notifications] Error removing push token:', error);
        return false;
    }
}

/**
 * Initialize push notifications (call after login)
 * Gets Expo push token and registers with backend
 */
export async function initializePushNotifications(): Promise<void> {
    const pushToken = await getExpoPushToken();
    if (pushToken) {
        await registerPushToken(pushToken);
    }
}

/**
 * Get notification history from server
 */
export async function getNotifications(
    page: number = 1,
    limit: number = 20,
): Promise<NotificationsResponse | null> {
    try {
        const token = await getSecureItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (!token) {
            return null;
        }

        const response = await fetch(
            `${API_CONFIG.BASE_URL}/notifications?page=${page}&limit=${limit}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        if (response.ok) {
            return await response.json();
        }

        return null;
    } catch (error) {
        console.error('[Notifications] Error fetching notifications:', error);
        return null;
    }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
    try {
        const token = await getSecureItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (!token) {
            return 0;
        }

        const response = await fetch(`${API_CONFIG.BASE_URL}/notifications/unread-count`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            return data.unread_count || 0;
        }

        return 0;
    } catch (error) {
        console.error('[Notifications] Error fetching unread count:', error);
        return 0;
    }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
    try {
        const token = await getSecureItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (!token) {
            return false;
        }

        const response = await fetch(
            `${API_CONFIG.BASE_URL}/notifications/${notificationId}/read`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        return response.ok;
    } catch (error) {
        console.error('[Notifications] Error marking notification as read:', error);
        return false;
    }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<boolean> {
    try {
        const token = await getSecureItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (!token) {
            return false;
        }

        const response = await fetch(`${API_CONFIG.BASE_URL}/notifications/read-all`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        return response.ok;
    } catch (error) {
        console.error('[Notifications] Error marking all as read:', error);
        return false;
    }
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void,
): Notifications.EventSubscription {
    return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void,
): Notifications.EventSubscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get last notification response (for handling app opened from notification)
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
    return await Notifications.getLastNotificationResponseAsync();
}

/**
 * Notification service object for convenience
 */
export const notificationService = {
    getFCMToken,
    getExpoPushToken, // Legacy alias
    registerPushToken,
    removePushToken,
    initializePushNotifications,
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    addNotificationReceivedListener,
    addNotificationResponseListener,
    getLastNotificationResponse,
};
