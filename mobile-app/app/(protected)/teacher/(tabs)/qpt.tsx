/**
 * QPT (Question Paper Tracking) Tab for Teacher
 * 
 * Shows exam paper delivery tracking events for Center Superintendents.
 * Only accessible if user has is_center_superintendent flag.
 */

import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Modal, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useAuth } from '../../../../src/contexts/AuthContext';
import apiClient from '../../../../src/api/client';

interface EventShift {
    id: string;
    shift_number: number;
    shift_time: string;
    shift_type: 'GENERAL' | 'MORNING' | 'AFTERNOON';
    paper_code: string;
    paper_name: string;
    status: string;
    images?: string[];
}

interface EventSummary {
    id: string;
    name: string;
    date: string;
    status: string;
    total_shifts: number;
    completed_shifts: number;
    pending_shifts: number;
    shifts: EventShift[];
}

export default function QPTScreen() {
    const { user } = useAuth();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const isCenterSuperintendent = user?.is_center_superintendent ?? false;

    const { data, isLoading, error, refetch, isRefetching } = useQuery({
        queryKey: ['qpt-events', user?.id],
        queryFn: async () => {
            const response = await apiClient.get('/exam-tracker/events/my-assigned');
            return response.data as EventSummary[];
        },
        enabled: isCenterSuperintendent,
    });

    if (!isCenterSuperintendent) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="lock-closed-outline" size={64} color="#9ca3af" />
                <Text style={styles.restrictedTitle}>Access Restricted</Text>
                <Text style={styles.restrictedText}>
                    This feature is only available for Center Superintendents.
                </Text>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#1e3a5f" />
                <Text style={styles.loadingText}>Loading events...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                <Text style={styles.errorTitle}>Failed to load events</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const events = data ?? [];
    const hasEvents = events.length > 0;

    const getStatusColor = (status: string) => {
        switch (status.toUpperCase()) {
            case 'COMPLETED':
                return '#10b981';
            case 'IN_PROGRESS':
                return '#f59e0b';
            case 'PENDING':
                return '#6b7280';
            default:
                return '#6b7280';
        }
    };

    const getShiftTypeLabel = (type: string) => {
        switch (type) {
            case 'GENERAL':
                return 'General';
            case 'MORNING':
                return 'Morning Shift';
            case 'AFTERNOON':
                return 'Afternoon Shift';
            default:
                return type;
        }
    };

    const groupShiftsByType = (shifts: EventShift[]) => {
        return shifts.reduce((acc, shift) => {
            const type = shift.shift_type;
            if (!acc[type]) {
                acc[type] = [];
            }
            acc[type].push(shift);
            return acc;
        }, {} as Record<string, EventShift[]>);
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl
                    refreshing={isRefetching}
                    onRefresh={refetch}
                    colors={['#1e3a5f']}
                />
            }
        >
            {/* Summary Card */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                    <Ionicons name="clipboard-outline" size={24} color="#1e3a5f" />
                    <Text style={styles.summaryTitle}>Question Paper Tracking</Text>
                </View>
                <Text style={styles.summarySubtitle}>
                    Track and manage exam paper delivery events assigned to your center.
                </Text>
                {hasEvents && (
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{events.length}</Text>
                            <Text style={styles.statLabel}>Total Events</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: '#10b981' }]}>
                                {events.filter(e => e.status === 'COMPLETED').length}
                            </Text>
                            <Text style={styles.statLabel}>Completed</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: '#f59e0b' }]}>
                                {events.filter(e => e.status === 'IN_PROGRESS').length}
                            </Text>
                            <Text style={styles.statLabel}>In Progress</Text>
                        </View>
                    </View>
                )}
            </View>

            {!hasEvents ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="document-outline" size={48} color="#9ca3af" />
                    <Text style={styles.emptyTitle}>No Events Assigned</Text>
                    <Text style={styles.emptyText}>
                        You don't have any question paper tracking events assigned yet.
                    </Text>
                </View>
            ) : (
                events.map((event) => {
                    const groupedShifts = groupShiftsByType(event.shifts);
                    const progressPercent = event.total_shifts > 0 
                        ? (event.completed_shifts / event.total_shifts) * 100 
                        : 0;

                    return (
                        <View key={event.id} style={styles.eventCard}>
                            {/* Event Header */}
                            <View style={styles.eventHeader}>
                                <View style={styles.eventTitleRow}>
                                    <Text style={styles.eventName}>{event.name}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) + '20' }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor(event.status) }]}>
                                            {event.status.replace('_', ' ')}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.eventDate}>
                                    <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                                    {' '}{new Date(event.date).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </Text>
                            </View>

                            {/* Progress Bar */}
                            <View style={styles.progressContainer}>
                                <View style={styles.progressBar}>
                                    <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                                </View>
                                <Text style={styles.progressText}>
                                    {event.completed_shifts} of {event.total_shifts} shifts completed
                                </Text>
                            </View>

                            {/* Shifts by Type */}
                            {Object.entries(groupedShifts).map(([type, shifts]) => (
                                <View key={type} style={styles.shiftSection}>
                                    <Text style={styles.shiftTypeHeader}>
                                        {getShiftTypeLabel(type)}
                                    </Text>
                                    {shifts.map((shift) => (
                                        <View key={shift.id} style={styles.shiftItem}>
                                            <View style={styles.shiftInfo}>
                                                <Text style={styles.shiftPaperCode}>{shift.paper_code}</Text>
                                                <Text style={styles.shiftPaperName} numberOfLines={1}>
                                                    {shift.paper_name}
                                                </Text>
                                                <Text style={styles.shiftTime}>
                                                    <Ionicons name="time-outline" size={12} color="#6b7280" />
                                                    {' '}{shift.shift_time}
                                                </Text>
                                            </View>
                                            <View style={[
                                                styles.shiftStatusDot,
                                                { backgroundColor: getStatusColor(shift.status) }
                                            ]} />
                                        </View>
                                    ))}
                                </View>
                            ))}
                        </View>
                    );
                })
            )}

            {/* Image Preview Modal */}
            <Modal
                visible={!!selectedImage}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <View style={styles.modalBackdrop}>
                    <TouchableOpacity
                        style={styles.modalClose}
                        onPress={() => setSelectedImage(null)}
                    >
                        <Ionicons name="close-circle" size={36} color="#fff" />
                    </TouchableOpacity>
                    {selectedImage && (
                        <Image
                            source={{ uri: selectedImage }}
                            style={styles.modalImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>
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
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#f3f4f6',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6b7280',
    },
    restrictedTitle: {
        marginTop: 16,
        fontSize: 20,
        fontWeight: '600',
        color: '#374151',
    },
    restrictedText: {
        marginTop: 8,
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
    },
    errorTitle: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: '#ef4444',
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#1e3a5f',
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontWeight: '600',
    },
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e3a5f',
        marginLeft: 8,
    },
    summarySubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1e3a5f',
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 32,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    emptyTitle: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
    },
    emptyText: {
        marginTop: 8,
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
    },
    eventCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    eventHeader: {
        marginBottom: 12,
    },
    eventTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    eventName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        flex: 1,
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    eventDate: {
        fontSize: 13,
        color: '#6b7280',
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 4,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#10b981',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: '#6b7280',
    },
    shiftSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    shiftTypeHeader: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    shiftItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        marginBottom: 8,
    },
    shiftInfo: {
        flex: 1,
    },
    shiftPaperCode: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e3a5f',
    },
    shiftPaperName: {
        fontSize: 13,
        color: '#374151',
        marginTop: 2,
    },
    shiftTime: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
    shiftStatusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginLeft: 8,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalClose: {
        position: 'absolute',
        top: 48,
        right: 16,
        zIndex: 10,
    },
    modalImage: {
        width: '90%',
        height: '70%',
    },
});
