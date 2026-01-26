/**
 * View Staffs Screen - Headmaster
 * 
 * Shows all faculty members at the headmaster's school.
 * Displays verification status (approved/rejected/pending).
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
    TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../src/api/client';
import { Ionicons } from '@expo/vector-icons';

interface Staff {
    id: string;
    user: {
        id: string;
        name: string;
        role: string;
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

interface StaffCardProps {
    staff: Staff;
    expanded: boolean;
    onToggle: () => void;
}

function StaffCard({ staff, expanded, onToggle }: StaffCardProps) {
    const getStatusColor = () => {
        switch (staff.approval_status) {
            case 'APPROVED': return '#22c55e';
            case 'REJECTED': return '#ef4444';
            default: return '#9ca3af';
        }
    };

    const getStatusIcon = () => {
        switch (staff.approval_status) {
            case 'APPROVED': return 'checkmark-circle';
            case 'REJECTED': return 'close-circle';
            default: return 'ellipse-outline';
        }
    };

    const getRoleDisplay = () => {
        switch (staff.user.role) {
            case 'HEADMASTER': return 'Headmaster';
            case 'TEACHER': return 'Teacher';
            default: return staff.user.role;
        }
    };

    // Group subjects by class
    const subjectsByClass = staff.teaching_assignments.reduce((acc, ta) => {
        if (!acc[ta.class_level]) acc[ta.class_level] = [];
        acc[ta.class_level].push(ta.subject);
        return acc;
    }, {} as Record<number, string[]>);

    return (
        <View style={styles.staffCard}>
            <TouchableOpacity style={styles.staffHeader} onPress={onToggle}>
                <View style={styles.avatarContainer}>
                    {staff.user.profile_image_url ? (
                        <Image
                            source={{ uri: staff.user.profile_image_url }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>
                                {staff.user.name.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                        <Ionicons name={getStatusIcon() as any} size={16} color="#ffffff" />
                    </View>
                </View>
                <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>{staff.user.name}</Text>
                    <Text style={styles.staffRole}>{getRoleDisplay()}</Text>
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
                        <Text style={styles.detailValue}>{staff.highest_qualification}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Experience:</Text>
                        <Text style={styles.detailValue}>{staff.years_of_experience} years</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Status:</Text>
                        <Text style={[styles.detailValue, { color: getStatusColor() }]}>
                            {staff.approval_status}
                        </Text>
                    </View>
                    
                    {Object.entries(subjectsByClass).length > 0 && (
                        <View style={styles.classesSection}>
                            <Text style={styles.classesSectionTitle}>Teaching Classes:</Text>
                            {Object.entries(subjectsByClass).map(([classLevel, subjects]) => (
                                <View key={classLevel} style={styles.classRow}>
                                    <Text style={styles.classLabel}>Class {classLevel}:</Text>
                                    <Text style={styles.subjectsText}>{subjects.join(', ')}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

export default function ViewStaffsScreen() {
    const insets = useSafeAreaInsets();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch all staff
    const { data: staffList, isLoading, refetch, isRefetching } = useQuery<Staff[]>({
        queryKey: ['school-staffs'],
        queryFn: async () => {
            const response = await apiClient.get('/form-6/school-staffs');
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

    // Filter staff by search query
    const filteredStaff = staffList?.filter(staff =>
        staff.user.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0d9488" />
                <Text style={styles.loadingText}>Loading staff...</Text>
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
                    <Text style={styles.headerTitle}>View Staffs</Text>
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
                    <Text style={styles.sectionTitle}>Find your colleagues</Text>

                    {/* Search Input */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#9ca3af" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by name..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {filteredStaff.length > 0 ? (
                        filteredStaff.map((staff) => (
                            <StaffCard
                                key={staff.id}
                                staff={staff}
                                expanded={expandedId === staff.id}
                                onToggle={() => setExpandedId(expandedId === staff.id ? null : staff.id)}
                            />
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={48} color="#d1d5db" />
                            <Text style={styles.emptyText}>
                                {searchQuery ? 'No staff found matching your search' : 'No staff found'}
                            </Text>
                        </View>
                    )}
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 8,
        fontSize: 15,
        color: '#1f2937',
    },
    staffCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
    },
    staffHeader: {
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
    staffInfo: {
        flex: 1,
    },
    staffName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    staffRole: {
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
