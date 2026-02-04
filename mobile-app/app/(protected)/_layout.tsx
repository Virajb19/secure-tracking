/**
 * Protected Routes Layout
 * 
 * Guards all routes in (protected) group.
 * Redirects to login if not authenticated.
 * Routes users based on their role.
 * 
 * SECURITY:
 * - Checks auth state on every render
 * - Provides logout in header
 * - Shows user info
 */
// import 'react-native-get-random-values';
import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, StatusBar, Image } from 'react-native';
import { Stack, router, useSegments, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../../src/services/notification.service';
import { getImagePreviewUrl } from '../../src/services/storage.service';

export default function ProtectedLayout() {
    const { isAuthenticated, isLoading, user, logout } = useAuth();
    const segments = useSegments();
    const insets = useSafeAreaInsets();
    const profileImageUrl = getImagePreviewUrl(user?.profile_image_url);
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch unread notification count
    const fetchUnreadCount = useCallback(async () => {
        try {
            const count = await notificationService.getUnreadCount();
            setUnreadCount(count);
        } catch (error) {
            console.log('Failed to fetch notification count');
        }
    }, []);

    // Refresh unread count periodically
    useEffect(() => {
        if (isAuthenticated) {
            fetchUnreadCount();
            const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, fetchUnreadCount]);

    // Redirect to login if not authenticated
    // Redirect to pending-approval if not active
    // Route to appropriate screen based on role
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace('/login');
            return;
        }

        if (!isLoading && isAuthenticated && user) {
            // Check if user is inactive (pending admin approval)
            if (!user.is_active) {
                router.replace('/pending-approval');
                return;
            }

            // Check current route
            const currentRoute = segments.join('/');

            // Route based on role
            if (user.role === 'TEACHER') {
                // Teachers go to teacher tabs
                if (!currentRoute.includes('teacher')) {
                    router.replace('/(protected)/teacher/(tabs)/home');
                }
            } else if (user.role === 'HEADMASTER') {
                // Headmasters go to headmaster home
                if (!currentRoute.includes('headmaster')) {
                    router.replace('/(protected)/headmaster');
                }
            } else if (user.role === 'CENTER_SUPERINTENDENT') {
                // Center Superintendents go to their own home
                if (!currentRoute.includes('center-superintendent')) {
                    router.replace('/(protected)/center-superintendent');
                }
            } else if (user.role === 'SEBA_OFFICER') {
                // SEBA officers use the delivery/tasks flow
                if (!currentRoute.includes('tasks')) {
                    router.replace('/(protected)/tasks');
                }
            }
        }
    }, [isAuthenticated, isLoading, user, segments]);

    // Handle logout
    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        // Navigate first, then logout to avoid race condition
                        // where component unmounts before navigation completes
                        router.replace('/login');
                        await logout();
                    },
                },
            ]
        );
    };

    // Don't render until auth check complete
    if (isLoading || !isAuthenticated) {
        return null;
    }

    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#1a1a2e',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                    fontWeight: '600',
                },
                headerRight: () => (
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            onPress={() => {
                                setUnreadCount(0);
                                router.push('/(protected)/notifications' as any);
                            }}
                            style={styles.notificationButton}
                        >
                            <Ionicons name="notifications-outline" size={24} color="#ffffff" />
                            {unreadCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                            <Text style={styles.logoutText}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                ),
                contentStyle: { backgroundColor: '#0f0f1a' },
            }}
        >
            <Stack.Screen
                name="tasks/index"
                options={{
                    title: '',
                    headerTitle: () => (
                        <View style={styles.headerCenter}>
                            <Text style={styles.headerTitle}>My Tasks</Text>
                        </View>
                    ),
                    headerLeft: () => (
                        <View style={styles.userInfo}>
                            {profileImageUrl ? (
                                <Image
                                    source={{ uri: profileImageUrl }}
                                    style={styles.avatarImage}
                                />
                            ) : (
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarText}>
                                        {(user?.name || 'O').charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <Text style={styles.userName} numberOfLines={1}>
                                {user?.name || 'Officer'}
                            </Text>
                        </View>
                    ),
                }}
            />
            <Stack.Screen
                name="tasks/[taskId]"
                options={{
                    title: 'Task Details',
                }}
            />
            <Stack.Screen
                name="teacher"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="headmaster"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="center-superintendent"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="notifications"
                options={{
                    title: 'Notifications',
                }}
            />
        </Stack>
    );
}

const styles = StyleSheet.create({
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    notificationButton: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 2,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    logoutButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    logoutText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '500',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingLeft: 4,
    },
    avatarCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#4f8cff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#4f8cff',
    },
    avatarText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
    },
    userName: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '500',
        maxWidth: 100,
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        color: '#ffffff',
        fontSize: 17,
        fontWeight: '600',
    },
});
