/**
 * Center Superintendent Colleagues Screen
 * 
 * Displays colleagues based on:
 * - Same school
 * - Same designation/role
 * - Same subjects (if teaching)
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../src/api/client';

interface Colleague {
    id: string;
    name: string;
    email: string;
    phone: string;
    designation?: string;
    highest_qualification?: string;
    years_of_experience?: number;
    subjects?: string[];
    profile_image_url?: string;
    approval_status?: string;
    match_type?: 'school' | 'role' | 'subject'; // How they match as colleague
}

export default function ColleaguesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const {
        data: colleagues,
        isLoading,
        error,
        refetch,
        isRefetching,
    } = useQuery<Colleague[]>({
        queryKey: ['colleagues'],
        queryFn: async () => {
            const response = await apiClient.get('/faculty/colleagues');
            return response.data;
        },
    });

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getAvatarColor = (name: string) => {
        const colors = [
            '#3b82f6',
            '#10b981',
            '#f59e0b',
            '#ef4444',
            '#8b5cf6',
            '#ec4899',
            '#06b6d4',
            '#84cc16',
        ];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    };

    const getApprovalBadge = (status?: string) => {
        switch (status) {
            case 'APPROVED':
                return { icon: 'checkmark-circle', color: '#22c55e', bg: '#dcfce7' };
            case 'REJECTED':
                return { icon: 'close-circle', color: '#ef4444', bg: '#fee2e2' };
            default:
                return { icon: 'time', color: '#f59e0b', bg: '#fef3c7' };
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading colleagues...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text style={styles.errorText}>Failed to load colleagues</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
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
                <Text style={styles.headerTitle}>Colleagues</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Colleagues List */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                }
            >
                {colleagues && colleagues.length > 0 ? (
                    <>
                        <Text style={styles.countText}>
                            {colleagues.length} colleague{colleagues.length !== 1 ? 's' : ''} found
                        </Text>
                        {colleagues.map((colleague) => {
                            const badge = getApprovalBadge(colleague.approval_status);
                            
                            return (
                                <View key={colleague.id} style={styles.colleagueCard}>
                                    <View style={styles.colleagueHeader}>
                                        {/* Avatar with approval badge */}
                                        <View style={styles.avatarContainer}>
                                            {colleague.profile_image_url ? (
                                                <Image 
                                                    source={{ uri: colleague.profile_image_url }} 
                                                    style={styles.avatarImage}
                                                />
                                            ) : (
                                                <View
                                                    style={[
                                                        styles.avatar,
                                                        { backgroundColor: getAvatarColor(colleague.name) },
                                                    ]}
                                                >
                                                    <Text style={styles.avatarText}>
                                                        {getInitials(colleague.name)}
                                                    </Text>
                                                </View>
                                            )}
                                            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                                                <Ionicons 
                                                    name={badge.icon as any} 
                                                    size={14} 
                                                    color={badge.color} 
                                                />
                                            </View>
                                        </View>

                                        {/* Info */}
                                        <View style={styles.colleagueInfo}>
                                            <Text style={styles.colleagueName}>{colleague.name}</Text>
                                            <Text style={styles.colleagueDesignation}>
                                                {colleague.designation || 'Staff'}
                                            </Text>
                                        </View>

                                        {/* Expand icon */}
                                        <Ionicons name="chevron-down" size={20} color="#9ca3af" />
                                    </View>

                                    {/* Details */}
                                    <View style={styles.colleagueDetails}>
                                        {colleague.highest_qualification && (
                                            <View style={styles.detailRow}>
                                                <Ionicons name="school-outline" size={14} color="#6b7280" />
                                                <Text style={styles.detailText}>
                                                    {colleague.highest_qualification}
                                                </Text>
                                            </View>
                                        )}
                                        {colleague.years_of_experience !== undefined && (
                                            <View style={styles.detailRow}>
                                                <Ionicons name="time-outline" size={14} color="#6b7280" />
                                                <Text style={styles.detailText}>
                                                    {colleague.years_of_experience} years experience
                                                </Text>
                                            </View>
                                        )}
                                        {colleague.subjects && colleague.subjects.length > 0 && (
                                            <View style={styles.subjectsContainer}>
                                                {colleague.subjects.slice(0, 3).map((subject, index) => (
                                                    <View key={index} style={styles.subjectBadge}>
                                                        <Text style={styles.subjectText}>{subject}</Text>
                                                    </View>
                                                ))}
                                                {colleague.subjects.length > 3 && (
                                                    <View style={styles.subjectBadge}>
                                                        <Text style={styles.subjectText}>
                                                            +{colleague.subjects.length - 3}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={64} color="#d1d5db" />
                        <Text style={styles.emptyTitle}>No Colleagues Found</Text>
                        <Text style={styles.emptyText}>
                            There are no colleagues matching your criteria at this time.
                        </Text>
                    </View>
                )}
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
        backgroundColor: '#374151',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
    },
    placeholder: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    countText: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 16,
    },
    colleagueCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    colleagueHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
    },
    statusBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    colleagueInfo: {
        flex: 1,
        marginLeft: 12,
    },
    colleagueName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    colleagueDesignation: {
        fontSize: 14,
        color: '#0d9488',
        marginTop: 2,
    },
    colleagueDetails: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    detailText: {
        fontSize: 13,
        color: '#6b7280',
    },
    subjectsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 8,
    },
    subjectBadge: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    subjectText: {
        fontSize: 12,
        color: '#3b82f6',
        fontWeight: '500',
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
        backgroundColor: '#0d9488',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 80,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 32,
    },
});
