/**
 * Teacher Events Screen
 * 
 * Displays list of school events created by headmaster.
 * Teachers can view events from their school.
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../../src/api/client';

interface Event {
    id: string;
    title: string;
    description: string;
    event_date: string;
    event_time?: string;
    location?: string;
    event_type: 'MEETING' | 'EXAM' | 'HOLIDAY' | 'OTHER';
    creator?: { id: string; name: string };
    school?: { id: string; name: string };
    created_at: string;
}

export default function TeacherEventsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const {
        data: events,
        isLoading,
        error,
        refetch,
        isRefetching,
    } = useQuery<Event[]>({
        queryKey: ['teacher-events'],
        queryFn: async () => {
            try {
                const response = await apiClient.get('/events');
                return response.data;
            } catch (err: any) {
                if (err.response?.status === 404) {
                    return [];
                }
                throw err;
            }
        },
    });

    const getEventIcon = (type: Event['event_type']) => {
        switch (type) {
            case 'MEETING':
                return { name: 'people', color: '#3b82f6' };
            case 'EXAM':
                return { name: 'document-text', color: '#f59e0b' };
            case 'HOLIDAY':
                return { name: 'sunny', color: '#10b981' };
            default:
                return { name: 'calendar', color: '#8b5cf6' };
        }
    };

    const getEventTypeStyle = (type: Event['event_type']) => {
        switch (type) {
            case 'MEETING':
                return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
            case 'EXAM':
                return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
            case 'HOLIDAY':
                return { bg: '#d1fae5', text: '#059669', border: '#a7f3d0' };
            default:
                return { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' };
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1e3a5f" />
                <Text style={styles.loadingText}>Loading events...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text style={styles.errorText}>Failed to load events</Text>
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
                <Text style={styles.headerTitle}>School Events</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                }
            >
                {events && events.length > 0 ? (
                    events.map((event) => {
                        const icon = getEventIcon(event.event_type);
                        const typeStyle = getEventTypeStyle(event.event_type);
                        
                        return (
                            <View key={event.id} style={styles.eventCard}>
                                <View style={styles.eventHeader}>
                                    <View
                                        style={[
                                            styles.iconContainer,
                                            { backgroundColor: typeStyle.bg },
                                        ]}
                                    >
                                        <Ionicons
                                            name={icon.name as any}
                                            size={24}
                                            color={icon.color}
                                        />
                                    </View>
                                    <View style={styles.eventInfo}>
                                        <Text style={styles.eventTitle}>{event.title}</Text>
                                        <View
                                            style={[
                                                styles.typeBadge,
                                                {
                                                    backgroundColor: typeStyle.bg,
                                                    borderColor: typeStyle.border,
                                                },
                                            ]}
                                        >
                                            <Text style={[styles.typeText, { color: typeStyle.text }]}>
                                                {event.event_type}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                
                                {event.description && (
                                    <Text style={styles.eventDescription} numberOfLines={3}>
                                        {event.description}
                                    </Text>
                                )}
                                
                                <View style={styles.eventMeta}>
                                    <View style={styles.metaItem}>
                                        <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                                        <Text style={styles.metaText}>
                                            {formatDate(event.event_date)}
                                        </Text>
                                    </View>
                                    {event.event_time && (
                                        <View style={styles.metaItem}>
                                            <Ionicons name="time-outline" size={16} color="#6b7280" />
                                            <Text style={styles.metaText}>{event.event_time}</Text>
                                        </View>
                                    )}
                                    {event.location && (
                                        <View style={styles.metaItem}>
                                            <Ionicons name="location-outline" size={16} color="#6b7280" />
                                            <Text style={styles.metaText}>{event.location}</Text>
                                        </View>
                                    )}
                                </View>

                                {event.creator && (
                                    <View style={styles.creatorInfo}>
                                        <Ionicons name="person-outline" size={14} color="#9ca3af" />
                                        <Text style={styles.creatorText}>
                                            Created by {event.creator.name}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    })
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
                        <Text style={styles.emptyTitle}>No Events</Text>
                        <Text style={styles.emptyText}>
                            No events scheduled yet. Events created by your headmaster will appear here.
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
        backgroundColor: '#1e3a5f',
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
        paddingBottom: 32,
    },
    eventCard: {
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
    eventHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    eventInfo: {
        flex: 1,
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    typeBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
    },
    typeText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    eventDescription: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
        marginBottom: 12,
    },
    eventMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 13,
        color: '#6b7280',
    },
    creatorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    creatorText: {
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
        backgroundColor: '#1e3a5f',
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
