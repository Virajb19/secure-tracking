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
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, StatusBar } from 'react-native';
import { Stack, router, useSegments, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../../src/services/notification.service';

export default function ProtectedLayout() {
    const { isAuthenticated, isLoading, user, logout } = useAuth();
    const segments = useSegments();
    const insets = useSafeAreaInsets();
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
    // Route to appropriate screen based on role
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace('/login');
            return;
        }

        if (!isLoading && isAuthenticated && user) {
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
                        await logout();
                        router.replace('/login');
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
                    title: 'My Tasks',
                    headerLeft: () => (
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user?.name || 'User'}</Text>
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
                name="notifications/index"
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
        paddingLeft: 8,
    },
    userName: {
        color: '#9ca3af',
        fontSize: 12,
    },
});
