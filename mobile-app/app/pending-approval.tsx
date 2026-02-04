/**
 * Pending Approval Screen
 * 
 * Shown to users who have registered but are not yet activated by admin.
 * Users can view their status and logout.
 * 
 * FEATURES:
 * - Shows pending status message
 * - Allows user to refresh status (check if activated)
 * - Allows logout
 */

import { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/contexts/AuthContext';
import apiClient from '../src/api/client';
import { User } from '../src/types';
import { storeUserData } from '../src/utils/storage';

export default function PendingApprovalScreen() {
    const { user, logout, refreshUser } = useAuth();
    const [isRefreshing, setIsRefreshing] = useState(false);

    /**
     * Check if user has been activated by admin.
     */
    const checkStatus = useCallback(async () => {
        setIsRefreshing(true);
        try {
            // Fetch latest user profile from server
            const response = await apiClient.get<User>('/auth/me');
            const updatedUser = response.data;

            // Update stored user data
            await storeUserData(updatedUser);

            // If user is now active, refresh context and redirect
            if (updatedUser.is_active) {
                if (refreshUser) {
                    await refreshUser();
                }
                Alert.alert(
                    'Account Activated!',
                    'Your account has been activated. You can now access the app.',
                    [
                        {
                            text: 'Continue',
                            onPress: () => {
                                // Redirect based on role
                                if (updatedUser.role === 'TEACHER') {
                                    router.replace('/(protected)/teacher/(tabs)/home');
                                } else if (updatedUser.role === 'HEADMASTER') {
                                    router.replace('/(protected)/headmaster');
                                } else if (updatedUser.role === 'CENTER_SUPERINTENDENT') {
                                    router.replace('/(protected)/center-superintendent');
                                } else if (updatedUser.role === 'SEBA_OFFICER') {
                                    router.replace('/(protected)/tasks');
                                }
                            },
                        },
                    ]
                );
            } else {
                Alert.alert(
                    'Still Pending',
                    'Your account is still pending admin approval. Please try again later.'
                );
            }
        } catch (error) {
            console.error('[PendingApproval] Error checking status:', error);
            Alert.alert('Error', 'Failed to check status. Please try again.');
        } finally {
            setIsRefreshing(false);
        }
    }, [refreshUser]);

    /**
     * Handle logout.
     */
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
                        router.replace('/login');
                        await logout();
                    },
                },
            ]
        );
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={checkStatus}
                    tintColor="#4da6ff"
                    colors={['#4da6ff']}
                />
            }
        >
            {/* Icon */}
            <View style={styles.iconContainer}>
                <Ionicons name="time-outline" size={80} color="#f0ad4e" />
            </View>

            {/* Title */}
            <Text style={styles.title}>Account Pending Approval</Text>

            {/* Message */}
            <Text style={styles.message}>
                Thank you for registering, <Text style={styles.userName}>{user?.name || 'User'}</Text>!
            </Text>

            <Text style={styles.description}>
                Your account is currently pending admin approval. Once approved, you will be able to
                access all features and complete your profile.
            </Text>

            {/* User Info Card */}
            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email:</Text>
                    <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Phone:</Text>
                    <Text style={styles.infoValue}>{user?.phone || 'N/A'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Role:</Text>
                    <Text style={styles.infoValue}>{user?.role?.replace('_', ' ') || 'N/A'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <View style={styles.statusBadge}>
                        <Ionicons name="ellipse" size={8} color="#f0ad4e" />
                        <Text style={styles.statusText}>Pending</Text>
                    </View>
                </View>
            </View>

            {/* Check Status Button */}
            <TouchableOpacity
                style={styles.checkButton}
                onPress={checkStatus}
                disabled={isRefreshing}
            >
                {isRefreshing ? (
                    <ActivityIndicator color="#ffffff" />
                ) : (
                    <>
                        <Ionicons name="refresh" size={20} color="#ffffff" />
                        <Text style={styles.checkButtonText}>Check Status</Text>
                    </>
                )}
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#ff6b6b" />
                <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>

            {/* Help Text */}
            <Text style={styles.helpText}>
                Pull down to refresh or tap "Check Status" to see if your account has been approved.
            </Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f1a',
    },
    content: {
        flexGrow: 1,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 16,
    },
    message: {
        fontSize: 16,
        color: '#b0b0b0',
        textAlign: 'center',
        marginBottom: 8,
    },
    userName: {
        color: '#4da6ff',
        fontWeight: '600',
    },
    description: {
        fontSize: 14,
        color: '#808080',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    infoCard: {
        backgroundColor: '#1a1a2e',
        borderRadius: 12,
        padding: 16,
        width: '100%',
        marginBottom: 24,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a3e',
    },
    infoLabel: {
        fontSize: 14,
        color: '#808080',
    },
    infoValue: {
        fontSize: 14,
        color: '#ffffff',
        fontWeight: '500',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(240, 173, 78, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        color: '#f0ad4e',
        fontWeight: '600',
        marginLeft: 6,
    },
    checkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4da6ff',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 8,
        width: '100%',
        marginBottom: 12,
    },
    checkButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#ff6b6b',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 8,
        width: '100%',
        marginBottom: 24,
    },
    logoutButtonText: {
        color: '#ff6b6b',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    helpText: {
        fontSize: 12,
        color: '#606060',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
