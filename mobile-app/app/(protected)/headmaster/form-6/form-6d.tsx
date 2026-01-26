/**
 * Form 6D - Teaching Staff (Class 11 & 12)
 * 
 * Lists all teaching faculty who teach Class 11 and 12.
 * Headmaster can verify/reject each faculty member.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../src/api/client';
import { Ionicons } from '@expo/vector-icons';

interface Faculty {
    id: string;
    user: {
        id: string;
        name: string;
        profile_image_url?: string;
    };
    highest_qualification: string;
    years_of_experience: number;
    approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
    teaching_assignments: Array<{
        class_level: number;
        subject: string;
    }>;
}

interface FacultyCardProps {
    faculty: Faculty;
    expanded: boolean;
    onToggle: () => void;
    onVerify: (id: string, status: 'APPROVED' | 'REJECTED') => void;
    isUpdating: boolean;
}

function FacultyCard({ faculty, expanded, onToggle, onVerify, isUpdating }: FacultyCardProps) {
    const getStatusColor = () => {
        switch (faculty.approval_status) {
            case 'APPROVED': return '#22c55e';
            case 'REJECTED': return '#ef4444';
            default: return '#9ca3af';
        }
    };

    const getStatusIcon = () => {
        switch (faculty.approval_status) {
            case 'APPROVED': return 'checkmark-circle';
            case 'REJECTED': return 'close-circle';
            default: return 'ellipse-outline';
        }
    };

    // Group subjects by class (only 11 & 12)
    const subjectsByClass = faculty.teaching_assignments
        .filter(ta => ta.class_level >= 11)
        .reduce((acc, ta) => {
            if (!acc[ta.class_level]) acc[ta.class_level] = [];
            acc[ta.class_level].push(ta.subject);
            return acc;
        }, {} as Record<number, string[]>);

    return (
        <View style={styles.facultyCard}>
            <TouchableOpacity style={styles.facultyHeader} onPress={onToggle}>
                <View style={styles.avatarContainer}>
                    {faculty.user.profile_image_url ? (
                        <Image
                            source={{ uri: faculty.user.profile_image_url }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>
                                {faculty.user.name.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                        <Ionicons name={getStatusIcon() as any} size={16} color="#ffffff" />
                    </View>
                </View>
                <View style={styles.facultyInfo}>
                    <Text style={styles.facultyName}>{faculty.user.name}</Text>
                    <Text style={styles.facultyRole}>Teacher</Text>
                </View>
                <Ionicons 
                    name={expanded ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color="#0d9488" 
                />
            </TouchableOpacity>

            {expanded && (
                <View style={styles.expandedContent}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Qualification:</Text>
                        <Text style={styles.detailValue}>{faculty.highest_qualification}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Experience:</Text>
                        <Text style={styles.detailValue}>{faculty.years_of_experience} years</Text>
                    </View>
                    
                    {Object.entries(subjectsByClass).length > 0 && (
                        <View style={styles.classesSection}>
                            <Text style={styles.classesSectionTitle}>Teaching Classes (11 & 12):</Text>
                            {Object.entries(subjectsByClass).map(([classLevel, subjects]) => (
                                <View key={classLevel} style={styles.classRow}>
                                    <Text style={styles.classLabel}>Class {classLevel}:</Text>
                                    <Text style={styles.subjectsText}>{subjects.join(', ')}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {faculty.approval_status === 'PENDING' && (
                        <View style={styles.actionButtons}>
                            <TouchableOpacity 
                                style={[styles.actionButton, styles.approveButton]}
                                onPress={() => onVerify(faculty.id, 'APPROVED')}
                                disabled={isUpdating}
                            >
                                {isUpdating ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark" size={18} color="#ffffff" />
                                        <Text style={styles.actionButtonText}>Verify</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.actionButton, styles.rejectButton]}
                                onPress={() => onVerify(faculty.id, 'REJECTED')}
                                disabled={isUpdating}
                            >
                                <Ionicons name="close" size={18} color="#ffffff" />
                                <Text style={styles.actionButtonText}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

export default function Form6DScreen() {
    const insets = useSafeAreaInsets();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const queryClient = useQueryClient();

    // Fetch teaching faculty (Class 11 & 12)
    const { data: facultyList, isLoading, refetch, isRefetching } = useQuery<Faculty[]>({
        queryKey: ['form-6d-faculty'],
        queryFn: async () => {
            const response = await apiClient.get('/form-6/teaching-staff-higher');
            return response.data;
        },
    });

    // Fetch school info
    const { data: profile } = useQuery({
        queryKey: ['faculty-profile'],
        queryFn: async () => {
            const response = await apiClient.get('/faculty/profile');
            return response.data;
        },
    });

    const schoolName = profile?.faculty?.school 
        ? `${profile.faculty.school.registration_code} - ${profile.faculty.school.name}`
        : 'Your School';

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    // Update verification status
    const verifyMutation = useMutation({
        mutationFn: async ({ facultyId, status }: { facultyId: string; status: 'APPROVED' | 'REJECTED' }) => {
            const response = await apiClient.patch(`/form-6/verify-faculty/${facultyId}`, { status });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['form-6d-faculty'] });
            setUpdatingId(null);
        },
        onError: (error: any) => {
            Alert.alert('Error', error.response?.data?.message || 'Failed to update status');
            setUpdatingId(null);
        },
    });

    // Submit Form 6D
    const submitMutation = useMutation({
        mutationFn: async () => {
            const response = await apiClient.post('/form-6/submit-6d');
            return response.data;
        },
        onSuccess: () => {
            Alert.alert('Success', 'Form 6D submitted successfully!');
        },
        onError: (error: any) => {
            Alert.alert('Error', error.response?.data?.message || 'Failed to submit Form 6D');
        },
    });

    const handleVerify = (facultyId: string, status: 'APPROVED' | 'REJECTED') => {
        Alert.alert(
            'Confirm Action',
            `Are you sure you want to ${status === 'APPROVED' ? 'verify' : 'reject'} this faculty member?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: () => {
                        setUpdatingId(facultyId);
                        verifyMutation.mutate({ facultyId, status });
                    },
                },
            ]
        );
    };

    const handleSubmit = () => {
        if (!confirmed) {
            Alert.alert('Confirmation Required', 'Please confirm that all faculties are verified.');
            return;
        }
        submitMutation.mutate();
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0d9488" />
                <Text style={styles.loadingText}>Loading teaching staff...</Text>
            </View>
        );
    }

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
                    <Text style={styles.headerTitle}>Form 6D</Text>
                    <Text style={styles.headerSubtitle}>{schoolName}</Text>
                </View>
            </View>

            {/* Content */}
            <View style={styles.cardContainer}>
                <ScrollView 
                    style={styles.scrollView} 
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                    }
                >
                    <Text style={styles.sectionTitle}>Teaching Faculties</Text>
                    
                    {/* Info Banner */}
                    <View style={styles.infoBanner}>
                        <Ionicons name="notifications-outline" size={18} color="#6b7280" />
                        <Text style={styles.infoBannerText}>
                            Form 6D will only list faculties who are teaching in Class 11 and 12
                        </Text>
                    </View>

                    {facultyList && facultyList.length > 0 ? (
                        facultyList.map((faculty) => (
                            <FacultyCard
                                key={faculty.id}
                                faculty={faculty}
                                expanded={expandedId === faculty.id}
                                onToggle={() => setExpandedId(expandedId === faculty.id ? null : faculty.id)}
                                onVerify={handleVerify}
                                isUpdating={updatingId === faculty.id}
                            />
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={48} color="#d1d5db" />
                            <Text style={styles.emptyText}>No teaching faculty found for Class 11 & 12</Text>
                        </View>
                    )}

                    {/* Confirmation Checkbox */}
                    <TouchableOpacity 
                        style={styles.confirmRow}
                        onPress={() => setConfirmed(!confirmed)}
                    >
                        <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
                            {confirmed && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                        </View>
                        <Text style={styles.confirmText}>
                            I confirm that all the mentioned faculties are part of the school as of 22nd January, 2026
                        </Text>
                    </TouchableOpacity>

                    {/* Submit Button */}
                    <TouchableOpacity 
                        style={[styles.submitButton, !confirmed && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={!confirmed || submitMutation.isPending}
                    >
                        {submitMutation.isPending ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <Text style={styles.submitButtonText}>Submit Form 6D</Text>
                        )}
                    </TouchableOpacity>
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
        paddingBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 12,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        borderStyle: 'dashed',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        gap: 8,
    },
    infoBannerText: {
        flex: 1,
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 18,
    },
    facultyCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
    },
    facultyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 8,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#6b7280',
    },
    statusBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    facultyInfo: {
        flex: 1,
    },
    facultyName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    facultyRole: {
        fontSize: 13,
        color: '#0d9488',
    },
    expandedContent: {
        padding: 16,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 13,
        color: '#6b7280',
        width: 100,
    },
    detailValue: {
        fontSize: 13,
        color: '#1f2937',
        fontWeight: '500',
        flex: 1,
    },
    classesSection: {
        marginTop: 8,
    },
    classesSectionTitle: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 6,
    },
    classRow: {
        flexDirection: 'row',
        marginBottom: 4,
        paddingLeft: 8,
    },
    classLabel: {
        fontSize: 12,
        color: '#9ca3af',
        width: 70,
    },
    subjectsText: {
        fontSize: 12,
        color: '#1f2937',
        flex: 1,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    approveButton: {
        backgroundColor: '#22c55e',
    },
    rejectButton: {
        backgroundColor: '#ef4444',
    },
    actionButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    confirmRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 16,
        gap: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#0d9488',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#0d9488',
    },
    confirmText: {
        flex: 1,
        fontSize: 13,
        color: '#374151',
        lineHeight: 18,
    },
    submitButton: {
        backgroundColor: '#374151',
        borderRadius: 8,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 16,
    },
    submitButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    submitButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6b7280',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 12,
        textAlign: 'center',
    },
});
