/**
 * Protected Routes Layout
 * 
 * Guards all routes in (protected) group.
 * Redirects to login if not authenticated.
 * 
 * SECURITY:
 * - Checks auth state on every render
 * - Provides logout in header
 * - Shows user info
 */
// import 'react-native-get-random-values';
import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';

export default function ProtectedLayout() {
    const { isAuthenticated, isLoading, user, logout } = useAuth();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, isLoading]);

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
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
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
        </Stack>
    );
}

const styles = StyleSheet.create({
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
