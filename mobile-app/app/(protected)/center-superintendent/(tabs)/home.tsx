/**
 * Center Superintendent Home Screen
 * 
 * Main dashboard showing:
 * - Profile card with info
 * - Action cards: Complete Profile, View Colleagues, Important Notices
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Modal,
    Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../../src/api/client';
import { Ionicons } from '@expo/vector-icons';

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

interface ProfileCompletionModalProps {
    visible: boolean;
    onComplete: () => void;
}

function ProfileCompletionModal({ visible, onComplete }: ProfileCompletionModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.illustrationContainer}>
                        <View style={styles.illustration}>
                            <Ionicons name="document-text" size={60} color="#3b82f6" />
                            <View style={styles.checkmarkBadge}>
                                <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                            </View>
                        </View>
                    </View>
                    
                    <Text style={styles.modalTitle}>Complete your profile</Text>
                    <Text style={styles.modalDescription}>
                        Kindly complete your profile by filling up details about your experience and school information.
                    </Text>
                    
                    <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
                        <Text style={styles.completeButtonText}>Complete Profile</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

export default function CenterSuperintendentHomeScreen() {
    const { user } = useAuth();
    const [showProfileModal, setShowProfileModal] = useState(false);

    // Fetch profile status
    const { data: profileStatus, isLoading: loadingProfile, refetch: refetchProfile } = useQuery({
        queryKey: ['profile-status'],
        queryFn: async () => {
            const response = await apiClient.get('/faculty/profile/status');
            return response.data;
        },
    });

    const hasCompletedProfile = profileStatus?.has_completed_profile || false;

    useFocusEffect(
        useCallback(() => {
            refetchProfile();
        }, [refetchProfile])
    );

    useEffect(() => {
        if (!loadingProfile && !hasCompletedProfile) {
            const timer = setTimeout(() => {
                setShowProfileModal(true);
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setShowProfileModal(false);
        }
    }, [loadingProfile, hasCompletedProfile]);

    const handleCompleteProfile = () => {
        setShowProfileModal(false);
        router.push('/(protected)/center-superintendent/complete-profile');
    };

    const handleViewProfile = () => {
        if (!hasCompletedProfile) {
            router.push('/(protected)/center-superintendent/complete-profile');
        } else {
            router.push('/(protected)/center-superintendent/view-profile');
        }
    };

    const handleViewColleagues = () => {
        router.push('/(protected)/center-superintendent/colleagues');
    };

    const handleImportantNotices = () => {
        router.push('/(protected)/center-superintendent/notices');
    };

    const getRoleDisplay = () => {
        return 'Center Superintendent';
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
                        <Ionicons name="mail-outline" size={16} color="#ffffff" />
                        <Text style={styles.profileEmail} numberOfLines={1}>
                            {user?.email || 'No email'}
                        </Text>
                    </View>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>{getRoleDisplay()}</Text>
                    </View>
                </View>
            </View>

            {/* Action Cards Grid */}
            <View style={styles.actionsGrid}>
                <View style={styles.actionRow}>
                    <ActionCard
                        title="Complete Profile"
                        icon={<Ionicons name="person-circle-outline" size={40} color="#0d9488" />}
                        onPress={handleViewProfile}
                    />
                    <ActionCard
                        title="View Colleagues"
                        icon={<Ionicons name="people-outline" size={40} color="#0d9488" />}
                        onPress={handleViewColleagues}
                        disabled={!hasCompletedProfile}
                    />
                    <ActionCard
                        title="Important Notices"
                        icon={<Ionicons name="notifications-outline" size={40} color="#0d9488" />}
                        onPress={handleImportantNotices}
                        disabled={!hasCompletedProfile}
                    />
                </View>
            </View>

            {/* Profile Completion Reminder */}
            {!hasCompletedProfile && !loadingProfile && (
                <TouchableOpacity style={styles.reminderCard} onPress={handleCompleteProfile}>
                    <Text style={styles.reminderText}>Kindly complete your profile</Text>
                </TouchableOpacity>
            )}

            {/* Profile Completion Modal */}
            <ProfileCompletionModal
                visible={showProfileModal}
                onComplete={handleCompleteProfile}
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
    },
    profileCard: {
        backgroundColor: '#374151',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    profileImageContainer: {
        marginRight: 16,
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#ffffff',
    },
    profileImagePlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#ffffff',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 4,
    },
    emailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    profileEmail: {
        fontSize: 14,
        color: '#d1d5db',
        marginLeft: 6,
        flex: 1,
    },
    roleBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderStyle: 'dashed',
    },
    roleBadgeText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '500',
    },
    actionsGrid: {
        marginBottom: 16,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    actionCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    actionCardDisabled: {
        opacity: 0.5,
    },
    actionIconContainer: {
        marginBottom: 8,
    },
    actionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'center',
    },
    actionTitleDisabled: {
        color: '#9ca3af',
    },
    reminderCard: {
        backgroundColor: '#dbeafe',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#93c5fd',
        borderStyle: 'dashed',
    },
    reminderText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1e40af',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
    },
    illustrationContainer: {
        marginBottom: 20,
    },
    illustration: {
        width: 100,
        height: 100,
        backgroundColor: '#eff6ff',
        borderRadius: 50,
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
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalDescription: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    completeButton: {
        backgroundColor: '#0d9488',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 8,
        width: '100%',
    },
    completeButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
});
