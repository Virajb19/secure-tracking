/**
 * Teacher Home Screen
 * 
 * Main dashboard for teachers showing:
 * - Profile card
 * - Complete Profile popup (if profile not completed)
 * - View Colleagues (only if profile completed)
 * - Important Notices (only if profile completed)
 * 
 * IMPORTANT:
 * - Profile can only be created ONCE
 * - Shows modal popup if profile not completed
 * - Colleagues and Notices only available after profile completion
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Modal,
    Dimensions,
    Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../src/api/client';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';

const { width } = Dimensions.get('window');

interface ActionCardProps {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    iconBgColor?: string;
    disabled?: boolean;
}

function ActionCard({ title, icon, onPress, iconBgColor = '#e5e7eb', disabled = false }: ActionCardProps) {
    return (
        <TouchableOpacity 
            style={[styles.actionCard, disabled && styles.actionCardDisabled]} 
            onPress={onPress}
            disabled={disabled}
        >
            <View style={[styles.actionIconContainer, { backgroundColor: iconBgColor }]}>
                <Ionicons name={icon} size={32} color={disabled ? '#9ca3af' : '#374151'} />
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
                    {/* Illustration */}
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
                        Kindly complete your profile by filling up details about your teaching experience.
                    </Text>
                    
                    <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
                        <Text style={styles.completeButtonText}>Complete Profile</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

export default function TeacherHomeScreen() {
    const { user } = useAuth();
    const [showProfileModal, setShowProfileModal] = useState(false);

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

    // Show modal if profile not completed (after loading)
    useEffect(() => {
        if (!loadingProfile && !hasCompletedProfile) {
            // Delay showing modal for smooth transition
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
        router.push('/(protected)/teacher/complete-profile');
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
        // TODO: Navigate to colleagues screen
        router.push('/(protected)/teacher/colleagues' as any);
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
        // TODO: Navigate to notices screen
        router.push('/(protected)/teacher/notices' as any);
    };

    const handleEditProfile = () => {
        if (!hasCompletedProfile) {
            router.push('/(protected)/teacher/complete-profile');
        } else {
            // Profile already exists - show view only
            router.push('/(protected)/teacher/view-profile' as any);
        }
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
                        <Text style={styles.roleBadgeText}>
                            {user?.role === 'TEACHER' ? 'Teacher' : user?.role === 'HEADMASTER' ? 'Headmaster' : user?.role}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Profile Status Banner */}
            {!loadingProfile && !hasCompletedProfile && (
                <TouchableOpacity 
                    style={styles.profileBanner} 
                    onPress={() => setShowProfileModal(true)}
                >
                    <Ionicons name="alert-circle" size={20} color="#f59e0b" />
                    <Text style={styles.profileBannerText}>
                        Complete your profile to access all features
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#f59e0b" />
                </TouchableOpacity>
            )}

            {hasCompletedProfile && (
                <View style={styles.profileCompletedBanner}>
                    <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                    <Text style={styles.profileCompletedText}>
                        Profile completed - Pending approval
                    </Text>
                </View>
            )}

            {/* Action Cards */}
            <View style={styles.actionsContainer}>
                <ActionCard
                    title={hasCompletedProfile ? "View Profile" : "Complete Profile"}
                    icon="person-outline"
                    onPress={handleEditProfile}
                    iconBgColor="#dbeafe"
                />
                <ActionCard
                    title="View Colleagues"
                    icon="people-outline"
                    onPress={handleViewColleagues}
                    iconBgColor={hasCompletedProfile ? "#fef3c7" : "#e5e7eb"}
                    disabled={!hasCompletedProfile}
                />
                <ActionCard
                    title="Important Notices"
                    icon="megaphone-outline"
                    onPress={handleImportantNotices}
                    iconBgColor={hasCompletedProfile ? "#fee2e2" : "#e5e7eb"}
                    disabled={!hasCompletedProfile}
                />
                <ActionCard
                    title="Events"
                    icon="calendar-outline"
                    onPress={() => router.push('/(protected)/teacher/events' as any)}
                    iconBgColor={hasCompletedProfile ? "#dcfce7" : "#e5e7eb"}
                    disabled={!hasCompletedProfile}
                />
                <ActionCard
                    title="Paper Setter"
                    icon="document-text-outline"
                    onPress={() => router.push('/(protected)/teacher/paper-setter-invitations' as any)}
                    iconBgColor={hasCompletedProfile ? "#fce7f3" : "#e5e7eb"}
                    disabled={!hasCompletedProfile}
                />
                <ActionCard
                    title="Helpdesk"
                    icon="headset-outline"
                    onPress={() => router.push('/(protected)/teacher/helpdesk' as any)}
                    iconBgColor="#ede9fe"
                />
            </View>

            {/* Info Card - Show only if profile not completed */}
            {!hasCompletedProfile && (
                <View style={styles.infoCard}>
                    <Ionicons name="information-circle" size={24} color="#3b82f6" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoTitle}>Important Notice</Text>
                        <Text style={styles.infoText}>
                            You can only create your profile once. Please ensure all details are correct before submitting as they cannot be modified later.
                        </Text>
                    </View>
                </View>
            )}

            {/* Profile Completion Modal */}
            <ProfileCompletionModal 
                visible={showProfileModal && !hasCompletedProfile} 
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
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    roleBadgeText: {
        fontSize: 12,
        color: '#4b5563',
        fontWeight: '500',
    },
    profileBanner: {
        backgroundColor: '#fef3c7',
        borderRadius: 12,
        padding: 12,
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fcd34d',
    },
    profileBannerText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: '#92400e',
        fontWeight: '500',
    },
    profileCompletedBanner: {
        backgroundColor: '#dcfce7',
        borderRadius: 12,
        padding: 12,
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#86efac',
    },
    profileCompletedText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#166534',
        fontWeight: '500',
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 24,
    },
    actionCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        width: '31%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    actionCardDisabled: {
        opacity: 0.6,
    },
    actionIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionTitle: {
        fontSize: 12,
        color: '#374151',
        fontWeight: '600',
        textAlign: 'center',
    },
    actionTitleDisabled: {
        color: '#9ca3af',
    },
    infoCard: {
        backgroundColor: '#eff6ff',
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    infoContent: {
        flex: 1,
        marginLeft: 12,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e40af',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 13,
        color: '#3b82f6',
        lineHeight: 18,
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
