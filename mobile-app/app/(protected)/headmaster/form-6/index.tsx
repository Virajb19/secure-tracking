/**
 * Form 6 Menu Screen
 * 
 * Navigation menu for Form 6 submissions:
 * - 6A: Teaching Staff (Pre-Primary to Class 10)
 * - 6B: Non-Teaching Staff
 * - 6C: Students (Pre-Primary to Class 10)
 * - 6C: Students (Class 11 & 12)
 * - 6D: Teaching Staff (Class 11 & 12)
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../../src/api/client';
import { Ionicons } from '@expo/vector-icons';

interface FormCardProps {
    formCode: string;
    title: string;
    subtitle: string;
    color: string;
    status?: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'DRAFT';
    rejectionReason?: string | null;
    onPress: () => void;
}

function FormCard({ formCode, title, subtitle, color, status, rejectionReason, onPress }: FormCardProps) {
    const getStatusBadge = () => {
        if (!status) return null;

        let badgeColor = '#9ca3af'; // gray for draft
        let badgeText = 'Draft';

        switch (status) {
            case 'SUBMITTED':
                badgeColor = '#f59e0b'; // orange
                badgeText = 'Pending';
                break;
            case 'APPROVED':
                badgeColor = '#22c55e'; // green
                badgeText = 'Approved';
                break;
            case 'REJECTED':
                badgeColor = '#ef4444'; // red
                badgeText = 'Rejected';
                break;
        }

        return (
            <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}>
                <Text style={styles.statusBadgeText}>{badgeText}</Text>
            </View>
        );
    };

    return (
        <TouchableOpacity style={styles.formCard} onPress={onPress}>
            <View style={[styles.formCodeBadge, { backgroundColor: color }]}>
                <Text style={styles.formCodeText}>{formCode}</Text>
            </View>
            <View style={styles.formInfo}>
                <View style={styles.formTitleRow}>
                    <Text style={styles.formTitle}>{title}</Text>
                    {getStatusBadge()}
                </View>
                <Text style={styles.formSubtitle}>{subtitle}</Text>
                {status === 'REJECTED' && rejectionReason && (
                    <View style={styles.rejectionContainer}>
                        <Ionicons name="alert-circle" size={14} color="#ef4444" />
                        <Text style={styles.rejectionText}>{rejectionReason}</Text>
                    </View>
                )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#0d9488" />
        </TouchableOpacity>
    );
}

export default function Form6MenuScreen() {
    const insets = useSafeAreaInsets();

    // Fetch faculty profile to get school info
    const { data: profile } = useQuery({
        queryKey: ['faculty-profile'],
        queryFn: async () => {
            const response = await apiClient.get('/faculty/profile');
            return response.data;
        },
    });

    // Fetch form submissions to get status
    const { data: formSubmissions } = useQuery({
        queryKey: ['my-form-submissions'],
        queryFn: async () => {
            const response = await apiClient.get('/form-submissions/my');
            return response.data;
        },
    });

    const schoolName = profile?.faculty?.school
        ? `${profile.faculty.school.registration_code} - ${profile.faculty.school.name}`
        : 'Your School';

    // Helper to get status and rejection reason for a specific form type
    const getFormInfo = (formType: string) => {
        if (!formSubmissions) return { status: undefined, rejectionReason: undefined };
        const submission = formSubmissions.find((s: any) => s.form_type === formType);
        return {
            status: submission?.status,
            rejectionReason: submission?.rejection_reason
        };
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Form 6</Text>
                    <Text style={styles.headerSubtitle}>{schoolName}</Text>
                </View>
            </View>

            {/* Form Cards */}
            <View style={styles.cardContainer}>
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    <FormCard
                        formCode="6A"
                        title="Teaching Staff"
                        subtitle="Pre-Primary to Class 10"
                        color="#0d9488"
                        status={getFormInfo('6A').status}
                        rejectionReason={getFormInfo('6A').rejectionReason}
                        onPress={() => router.push('/(protected)/headmaster/form-6/form-6a')}
                    />

                    <FormCard
                        formCode="6B"
                        title="Non-Teaching Staff"
                        subtitle="Including Fourth Grade Staff"
                        color="#0d9488"
                        status={getFormInfo('6B').status}
                        rejectionReason={getFormInfo('6B').rejectionReason}
                        onPress={() => router.push('/(protected)/headmaster/form-6/form-6b')}
                    />

                    <FormCard
                        formCode="6C"
                        title="Students (Upto Class X)"
                        subtitle="Pre-Primary to Class 10"
                        color="#0d9488"
                        status={getFormInfo('6C_LOWER').status}
                        rejectionReason={getFormInfo('6C_LOWER').rejectionReason}
                        onPress={() => router.push('/(protected)/headmaster/form-6/form-6c-lower')}
                    />

                    <FormCard
                        formCode="6C"
                        title="Students (Class XI & XII)"
                        subtitle="Class 11 & Class 12"
                        color="#0d9488"
                        status={getFormInfo('6C_HIGHER').status}
                        rejectionReason={getFormInfo('6C_HIGHER').rejectionReason}
                        onPress={() => router.push('/(protected)/headmaster/form-6/form-6c-higher')}
                    />

                    <FormCard
                        formCode="6D"
                        title="Teaching Staff"
                        subtitle="Class 11 & 12"
                        color="#0d9488"
                        status={getFormInfo('6D').status}
                        rejectionReason={getFormInfo('6D').rejectionReason}
                        onPress={() => router.push('/(protected)/headmaster/form-6/form-6d')}
                    />
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        backgroundColor: '#374151',
        paddingHorizontal: 16,
        paddingBottom: 40,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#d1d5db',
    },
    cardContainer: {
        flex: 1,
        backgroundColor: '#ffffff',
        marginTop: -24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    formCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    formCodeBadge: {
        width: 48,
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    formCodeText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
    },
    formInfo: {
        flex: 1,
    },
    formTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    formTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    formSubtitle: {
        fontSize: 13,
        color: '#0d9488',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#ffffff',
    },
    rejectionContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 6,
        gap: 4,
    },
    rejectionText: {
        fontSize: 12,
        color: '#ef4444',
        flex: 1,
    },
});
