/**
 * Headmaster/Principal Home Screen
 * 
 * Main dashboard showing:
 * - Profile card with school info
 * - Action cards: View Profile, View Colleagues, Important Notices, Question Paper, Form 6 Submit
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

export default function HeadmasterHomeScreen() {
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
        router.push('/(protected)/headmaster/complete-profile');
    };

    const handleViewProfile = () => {
        if (!hasCompletedProfile) {
            router.push('/(protected)/headmaster/complete-profile');
        } else {
            router.push('/(protected)/headmaster/view-profile');
        }
    };

    const handleViewColleagues = () => {
        router.push('/(protected)/headmaster/view-staffs');
    };

    const handleImportantNotices = () => {
        router.push('/(protected)/headmaster/notices');
    };

    const handleQuestionPaper = () => {
        router.push('/(protected)/headmaster/question-paper');
    };

    const handleForm6 = () => {
        router.push('/(protected)/headmaster/form-6');
    };

    const getRoleDisplay = () => {
        if (user?.role === 'HEADMASTER') return 'Principal / Headmaster';
        return user?.role || 'Headmaster';
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
                        title="View Profile"
                        icon={<Ionicons name="person-circle-outline" size={40} color="#0d9488" />}
                        onPress={handleViewProfile}
                    />
                    <ActionCard
                        title="View Colleagues"
                        icon={<Ionicons name="people-outline" size={40} color="#0d9488" />}
                        onPress={handleViewColleagues}
                    />
                    <ActionCard
                        title="Important Notices"
                        icon={<Ionicons name="notifications-outline" size={40} color="#0d9488" />}
                        onPress={handleImportantNotices}
                    />
                </View>
                <View style={styles.actionRow}>
                    <ActionCard
                        title="Question Paper"
                        icon={<Ionicons name="document-text-outline" size={40} color="#0d9488" />}
                        onPress={handleQuestionPaper}
                    />
                    <ActionCard
                        title="Form 6 Submit"
                        icon={<Ionicons name="clipboard-outline" size={40} color="#0d9488" />}
                        onPress={handleForm6}
                    />
                </View>
            </View>

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
        paddingBottom: 32,
    },
    profileCard: {
        backgroundColor: '#374151',
        paddingHorizontal: 20,
        paddingVertical: 24,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    profileImageContainer: {
        marginRight: 16,
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
    },
    profileImagePlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#4b5563',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 4,
    },
    emailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    profileEmail: {
        fontSize: 14,
        color: '#d1d5db',
        flex: 1,
    },
    roleBadge: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#93c5fd',
    },
    roleBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1e40af',
    },
    actionsGrid: {
        padding: 16,
        gap: 12,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    actionCardDisabled: {
        opacity: 0.5,
    },
    actionIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        overflow: 'hidden',
    },
    actionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1f2937',
        textAlign: 'center',
    },
    actionTitleDisabled: {
        color: '#9ca3af',
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
        maxWidth: 320,
        alignItems: 'center',
    },
    illustrationContainer: {
        marginBottom: 16,
    },
    illustration: {
        width: 100,
        height: 100,
        borderRadius: 50,
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
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
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
        backgroundColor: '#374151',
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
