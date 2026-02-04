/**
 * Profile Completion Blocker Component
 * 
 * A modal dialog that blocks the entire UI until the user completes their profile.
 * Shows a warning that profile cannot be updated after submission.
 * 
 * USAGE:
 * Place this component in home screens for roles that require profile completion.
 * It will render as a full-screen modal when profile is not completed.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { UserRole } from '../types';

interface ProfileCompletionBlockerProps {
    visible: boolean;
    userName?: string;
    userRole: UserRole;
}

/**
 * Get the complete-profile route based on user role.
 */
function getCompleteProfileRoute(role: UserRole): string {
    switch (role) {
        case 'TEACHER':
            return '/(protected)/teacher/complete-profile';
        case 'HEADMASTER':
            return '/(protected)/headmaster/complete-profile';
        case 'CENTER_SUPERINTENDENT':
            return '/(protected)/center-superintendent/complete-profile';
        case 'SEBA_OFFICER':
            return '/(protected)/tasks/complete-profile';
        default:
            return '/(protected)/teacher/complete-profile';
    }
}

export default function ProfileCompletionBlocker({
    visible,
    userName,
    userRole,
}: ProfileCompletionBlockerProps) {
    if (!visible) return null;

    const handleCompleteProfile = () => {
        const route = getCompleteProfileRoute(userRole);
        router.push(route as any);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Icon */}
                    <View style={styles.iconContainer}>
                        <Ionicons name="person-circle-outline" size={80} color="#4da6ff" />
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Complete Your Profile</Text>

                    {/* Greeting */}
                    {userName && (
                        <Text style={styles.greeting}>
                            Welcome, <Text style={styles.userName}>{userName}</Text>!
                        </Text>
                    )}

                    {/* Description */}
                    <Text style={styles.description}>
                        Before you can access the app features, you need to complete your profile with your professional details.
                    </Text>

                    {/* Warning Banner */}
                    <View style={styles.warningBanner}>
                        <Ionicons name="warning" size={20} color="#856404" />
                        <Text style={styles.warningText}>
                            ⚠️ Important: Your profile information cannot be modified after submission. Please ensure all details are correct before submitting.
                        </Text>
                    </View>

                    {/* Continue Button */}
                    <TouchableOpacity
                        style={styles.continueButton}
                        onPress={handleCompleteProfile}
                    >
                        <Text style={styles.continueButtonText}>Complete Profile</Text>
                        <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                    </TouchableOpacity>

                    {/* Info Text */}
                    <Text style={styles.infoText}>
                        After completing your profile, an admin will review and approve your account.
                    </Text>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        backgroundColor: '#1a1a2e',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 8,
    },
    greeting: {
        fontSize: 16,
        color: '#b0b0b0',
        textAlign: 'center',
        marginBottom: 16,
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
        marginBottom: 20,
    },
    warningBanner: {
        backgroundColor: '#fff3cd',
        borderWidth: 1,
        borderColor: '#ffc107',
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
        gap: 10,
        width: '100%',
    },
    warningText: {
        flex: 1,
        fontSize: 13,
        color: '#856404',
        lineHeight: 18,
    },
    continueButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4da6ff',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        gap: 8,
    },
    continueButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    },
    infoText: {
        fontSize: 12,
        color: '#606060',
        textAlign: 'center',
        marginTop: 16,
        fontStyle: 'italic',
    },
});
