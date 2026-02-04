/**
 * Teacher Home Tab Screen
 * 
 * Main dashboard for teachers showing:
 * - Profile card
 * - Complete Profile popup (if profile not completed)
 * - Action cards: Complete Profile, View Colleagues, Important Notices
 * - Profile status banner
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../../src/api/client';
import { Ionicons } from '@expo/vector-icons';
import ProfileCompletionBlocker from '../../../../src/components/ProfileCompletionBlocker';

const { width } = Dimensions.get('window');

interface ActionCardProps {
    title: string;
    icon: React.ReactNode;
    onPress: () => void;
    disabled?: boolean;
}

function ActionCard({ title, icon, onPress, disabled = false }: ActionCardProps) {
    return (
        <TouchableOpacity
            style={[styles.actionCard, disabled && styles.actionCardDisabled]}
            onPress={onPress}
            disabled={disabled}
        >
            <View style={styles.actionIconContainer}>
                {icon}
            </View>
            <Text style={[styles.actionTitle, disabled && styles.actionTitleDisabled]}>{title}</Text>
        </TouchableOpacity>
    );
}

export default function TeacherHomeTabScreen() {
    const { user } = useAuth();

    // Fetch profile status from backend
    const { data: profileStatus, isLoading: loadingProfile, refetch: refetchProfile } = useQuery({
        queryKey: ['profile-status'],
        queryFn: async () => {
            const response = await apiClient.get('/faculty/profile/status');
            return response.data;
        },
    });

    const hasCompletedProfile = profileStatus?.has_completed_profile || false;

    // Refetch profile status when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            refetchProfile();
        }, [refetchProfile])
    );

    const handleViewProfile = () => {
        if (!hasCompletedProfile) {
            router.push('/(protected)/teacher/complete-profile');
        } else {
            router.push('/(protected)/teacher/view-profile');
        }
    };

    const handleViewColleagues = () => {
        if (!hasCompletedProfile) {
            Alert.alert(
                'Profile Required',
                'Please complete your profile first to view colleagues.',
                [{ text: 'OK' }]
            );
            return;
        }
        router.push('/(protected)/teacher/colleagues');
    };

    const handleImportantNotices = () => {
        if (!hasCompletedProfile) {
            Alert.alert(
                'Profile Required',
                'Please complete your profile first to view notices.',
                [{ text: 'OK' }]
            );
            return;
        }
        router.push('/(protected)/teacher/notices');
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Profile Card */}
            <View style={styles.profileCard}>
                <View style={styles.profileImageContainer}>
                    {user?.profile_image_url ? (
                        <Image
                            source={{ uri: user.profile_image_url }}
                            style={styles.profileImage}
                        />
                    ) : (
                        <View style={styles.profileImagePlaceholder}>
                            <Ionicons name="person" size={40} color="#9ca3af" />
                        </View>
                    )}
                </View>
                <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{user?.name || 'User'}</Text>
                    <View style={styles.emailRow}>
                        <Ionicons name="mail-outline" size={16} color="#6b7280" />
                        <Text style={styles.profileEmail} numberOfLines={1}>
                            {user?.email || 'No email'}
                        </Text>
                    </View>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>Teacher</Text>
                    </View>
                </View>
            </View>

            {/* Action Cards Grid */}
            <View style={styles.actionsGrid}>
                <View style={styles.actionRow}>
                    <ActionCard
                        title={hasCompletedProfile ? "Complete\nProfile" : "Complete\nProfile"}
                        icon={
                            <View style={styles.iconCircle}>
                                <Ionicons name="person-circle-outline" size={36} color="#0369a1" />
                            </View>
                        }
                        onPress={handleViewProfile}
                    />
                    <ActionCard
                        title="View\nColleagues"
                        icon={
                            <View style={styles.iconCircle}>
                                <Ionicons name="people-outline" size={36} color="#0369a1" />
                            </View>
                        }
                        onPress={handleViewColleagues}
                        disabled={!hasCompletedProfile}
                    />
                    <ActionCard
                        title="Important\nNotices"
                        icon={
                            <View style={styles.iconCircle}>
                                <Ionicons name="newspaper-outline" size={36} color="#0369a1" />
                            </View>
                        }
                        onPress={handleImportantNotices}
                        disabled={!hasCompletedProfile}
                    />
                </View>
            </View>

            {/* Profile Status Banner */}
            {!loadingProfile && !hasCompletedProfile && (
                <View style={styles.profileBanner}>
                    <Text style={styles.profileBannerText}>
                        Complete your profile to access all features
                    </Text>
                </View>
            )}

            {/* Profile Completion Blocker */}
            <ProfileCompletionBlocker
                visible={!loadingProfile && !hasCompletedProfile}
                userName={user?.name}
                userRole={user?.role || 'TEACHER'}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    content: {
        padding: 16,
        paddingBottom: 32,
    },
    profileCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    profileImageContainer: {
        marginRight: 16,
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    profileImagePlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#1e3a5f',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 4,
    },
    emailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    profileEmail: {
        fontSize: 14,
        color: '#6b7280',
        marginLeft: 4,
        flex: 1,
    },
    roleBadge: {
        backgroundColor: '#e5e7eb',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    roleBadgeText: {
        fontSize: 12,
        color: '#4b5563',
        fontWeight: '500',
    },
    actionsGrid: {
        marginTop: 24,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionCard: {
        backgroundColor: '#e0f2fe',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        width: '31%',
        minHeight: 110,
    },
    actionCardDisabled: {
        opacity: 0.5,
    },
    actionIconContainer: {
        width: 56,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionTitle: {
        fontSize: 11,
        color: '#374151',
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 14,
    },
    actionTitleDisabled: {
        color: '#9ca3af',
    },
    profileBanner: {
        backgroundColor: '#e0f2fe',
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#bae6fd',
    },
    profileBannerText: {
        fontSize: 14,
        color: '#0369a1',
        fontWeight: '500',
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 32,
        width: width - 48,
        maxWidth: 360,
        alignItems: 'center',
    },
    illustrationContainer: {
        marginBottom: 24,
    },
    illustration: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmarkBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#ffffff',
        borderRadius: 12,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 12,
        textAlign: 'center',
    },
    modalDescription: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    completeButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 32,
        width: '100%',
    },
    completeButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
});
