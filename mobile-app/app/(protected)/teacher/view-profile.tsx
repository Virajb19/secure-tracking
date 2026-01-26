import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../src/api/client';

interface TeachingClass {
    class_level: string;
    subjects: string[];
}

interface FacultyProfile {
    id: string;
    highest_qualification: string;
    years_of_experience: number;
    is_profile_locked: boolean;
    school: {
        id: string;
        name: string;
        code: string;
    };
    teaching_assignments: {
        id: string;
        class_level: string;
        subject: string;
    }[];
}

interface ProfileResponse {
    has_profile: boolean;
    faculty: FacultyProfile | null;
}

export default function ViewProfileScreen() {
    const router = useRouter();

    const {
        data: profileData,
        isLoading,
        error,
    } = useQuery<ProfileResponse>({
        queryKey: ['faculty-profile'],
        queryFn: async () => {
            const response = await apiClient.get('/faculty/profile');
            return response.data;
        },
    });

    const profile = profileData?.faculty;

    // Group teaching assignments by class level
    const groupedTeachingClasses = React.useMemo(() => {
        if (!profile?.teaching_assignments) return [];
        
        const grouped: Record<string, string[]> = {};
        profile.teaching_assignments.forEach((assignment) => {
            if (!grouped[assignment.class_level]) {
                grouped[assignment.class_level] = [];
            }
            grouped[assignment.class_level].push(assignment.subject);
        });
        
        return Object.entries(grouped).map(([class_level, subjects]) => ({
            class_level,
            subjects,
        }));
    }, [profile?.teaching_assignments]);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
        );
    }

    if (error || !profile) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text style={styles.errorText}>
                    {!profileData?.has_profile 
                        ? 'No profile found. Please complete your profile first.' 
                        : 'Failed to load profile'}
                </Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.retryButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Profile</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Profile Locked Badge */}
                {profile.is_profile_locked && (
                    <View style={styles.lockedBadge}>
                        <Ionicons name="lock-closed" size={16} color="#7c3aed" />
                        <Text style={styles.lockedText}>
                            Profile is locked and cannot be edited
                        </Text>
                    </View>
                )}

                {/* School Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>School Information</Text>
                    <View style={styles.card}>
                        <View style={styles.infoRow}>
                            <Ionicons name="school-outline" size={20} color="#6b7280" />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>School Name</Text>
                                <Text style={styles.infoValue}>{profile.school.name}</Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Ionicons name="barcode-outline" size={20} color="#6b7280" />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>School Code</Text>
                                <Text style={styles.infoValue}>{profile.school.code}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Qualifications */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Qualifications</Text>
                    <View style={styles.card}>
                        <View style={styles.infoRow}>
                            <Ionicons name="ribbon-outline" size={20} color="#6b7280" />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Highest Qualification</Text>
                                <Text style={styles.infoValue}>
                                    {profile.highest_qualification}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Ionicons name="time-outline" size={20} color="#6b7280" />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Years of Experience</Text>
                                <Text style={styles.infoValue}>
                                    {profile.years_of_experience} years
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Teaching Classes */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Teaching Classes</Text>
                    {groupedTeachingClasses.length > 0 ? (
                        groupedTeachingClasses.map((item, index) => (
                            <View key={index} style={styles.card}>
                                <View style={styles.classHeader}>
                                    <View style={styles.classBadge}>
                                        <Ionicons name="book" size={16} color="#3b82f6" />
                                        <Text style={styles.classLevel}>
                                            Class {item.class_level}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.subjectsGrid}>
                                    {item.subjects.map((subject, subIndex) => (
                                        <View key={subIndex} style={styles.subjectChip}>
                                            <Text style={styles.subjectChipText}>{subject}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.card}>
                            <Text style={styles.noDataText}>
                                No teaching assignments added
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    placeholder: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    lockedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3e8ff',
        borderWidth: 1,
        borderColor: '#c4b5fd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        gap: 8,
    },
    lockedText: {
        fontSize: 13,
        color: '#7c3aed',
        fontWeight: '500',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#9ca3af',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        color: '#1f2937',
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginVertical: 12,
    },
    classHeader: {
        marginBottom: 12,
    },
    classBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    classLevel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#3b82f6',
    },
    subjectsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    subjectChip: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    subjectChipText: {
        fontSize: 13,
        color: '#4b5563',
        fontWeight: '500',
    },
    noDataText: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        paddingVertical: 12,
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        padding: 24,
    },
    errorText: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 12,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
});
