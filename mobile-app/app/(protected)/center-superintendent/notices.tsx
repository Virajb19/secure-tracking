/**
 * Center Superintendent Notices Screen
 * 
 * Displays important notices.
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../src/api/client';

interface Notice {
    id: string;
    title: string;
    content: string;
    priority: 'HIGH' | 'NORMAL' | 'LOW';
    published_at: string;
    expires_at?: string;
}

export default function NoticesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const {
        data: notices,
        isLoading,
        error,
        refetch,
        isRefetching,
    } = useQuery<Notice[]>({
        queryKey: ['notices'],
        queryFn: async () => {
            try {
                const response = await apiClient.get('/notices');
                return response.data;
            } catch (err: any) {
                if (err.response?.status === 404) {
                    return [];
                }
                throw err;
            }
        },
    });

    const getPriorityStyle = (priority: Notice['priority']) => {
        switch (priority) {
            case 'HIGH':
                return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', icon: 'alert-circle' };
            case 'LOW':
                return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', icon: 'information-circle' };
            default:
                return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', icon: 'notifications' };
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0d9488" />
                <Text style={styles.loadingText}>Loading notices...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text style={styles.errorText}>Failed to load notices</Text>
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
                <Text style={styles.headerTitle}>Important Notices</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                }
            >
                {notices && notices.length > 0 ? (
                    notices.map((notice) => {
                        const priorityStyle = getPriorityStyle(notice.priority);
                        
                        return (
                            <View
                                key={notice.id}
                                style={[
                                    styles.noticeCard,
                                    { borderLeftColor: priorityStyle.text },
                                ]}
                            >
                                <View style={styles.noticeHeader}>
                                    <View
                                        style={[
                                            styles.priorityBadge,
                                            {
                                                backgroundColor: priorityStyle.bg,
                                                borderColor: priorityStyle.border,
                                            },
                                        ]}
                                    >
                                        <Ionicons
                                            name={priorityStyle.icon as any}
                                            size={14}
                                            color={priorityStyle.text}
                                        />
                                        <Text
                                            style={[
                                                styles.priorityText,
                                                { color: priorityStyle.text },
                                            ]}
                                        >
                                            {notice.priority}
                                        </Text>
                                    </View>
                                    <Text style={styles.dateText}>
                                        {formatDate(notice.published_at)}
                                    </Text>
                                </View>
                                <Text style={styles.noticeTitle}>{notice.title}</Text>
                                <Text style={styles.noticeContent}>{notice.content}</Text>
                                {notice.expires_at && (
                                    <View style={styles.expiresRow}>
                                        <Ionicons name="time-outline" size={14} color="#9ca3af" />
                                        <Text style={styles.expiresText}>
                                            Expires: {formatDate(notice.expires_at)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    })
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={64} color="#d1d5db" />
                        <Text style={styles.emptyTitle}>No Notices</Text>
                        <Text style={styles.emptyText}>
                            No important notices at this time.
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
    noticeCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    noticeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        gap: 4,
    },
    priorityText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    dateText: {
        fontSize: 12,
        color: '#9ca3af',
    },
    noticeTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 8,
    },
    noticeContent: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
    },
    expiresRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    expiresText: {
        fontSize: 12,
        color: '#9ca3af',
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
