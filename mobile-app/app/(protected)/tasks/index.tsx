/**
 * Tasks List Screen
 * 
 * PHASE 2 IMPLEMENTATION
 * 
 * Displays assigned tasks for DELIVERY user with:
 * - Task cards showing sealed_pack_code, locations, status
 * - SUSPICIOUS tasks highlighted
 * - Pull-to-refresh
 * - Navigation to task details
 * - Loading, empty, and error states
 * - Auto-refresh when screen gains focus
 */

import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/contexts/AuthContext';
import { fetchMyTasks } from '../../../src/services/task.service';
import { Task, TaskStatus } from '../../../src/types';

/**
 * Status badge colors and labels
 */
const STATUS_CONFIG: Record<TaskStatus, { color: string; bgColor: string; label: string }> = {
    PENDING: {
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.15)',
        label: 'Pending',
    },
    IN_PROGRESS: {
        color: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.15)',
        label: 'In Progress',
    },
    COMPLETED: {
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.15)',
        label: 'Completed',
    },
    SUSPICIOUS: {
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.15)',
        label: '⚠️ Suspicious',
    },
};

export default function TasksScreen() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

    /**
     * Load tasks from API
     */
    const loadTasks = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setIsRefreshing(true);
        } else if (!hasFetchedOnce) {
            setIsLoading(true);
        }
        setError(null);

        const result = await fetchMyTasks();

        if (result.success && result.tasks) {
            setTasks(result.tasks);
        } else {
            setError(result.error || 'Failed to load tasks');
        }

        setIsLoading(false);
        setIsRefreshing(false);
        setHasFetchedOnce(true);
    }, [hasFetchedOnce]);

    /**
     * Refresh tasks when screen gains focus (e.g., after returning from task detail)
     */
    useFocusEffect(
        useCallback(() => {
            loadTasks(hasFetchedOnce); // Show refresh indicator only after first load
        }, [hasFetchedOnce])
    );

    /**
     * Navigate to task detail
     */
    const handleTaskPress = (taskId: string) => {
        router.push(`/(protected)/tasks/${taskId}`);
    };

    /**
     * Render status badge
     */
    const renderStatusBadge = (status: TaskStatus) => {
        const config = STATUS_CONFIG[status];
        return (
            <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
                <Text style={[styles.statusText, { color: config.color }]}>
                    {config.label}
                </Text>
            </View>
        );
    };

    /**
     * Render single task card
     */
    const renderTaskCard = ({ item: task }: { item: Task }) => {
        const isSuspicious = task.status === 'SUSPICIOUS';

        return (
            <TouchableOpacity
                style={[
                    styles.taskCard,
                    isSuspicious && styles.suspiciousCard,
                ]}
                onPress={() => handleTaskPress(task.id)}
                activeOpacity={0.7}
            >
                {/* Header with pack code and status */}
                <View style={styles.taskHeader}>
                    <Text style={styles.packCode}>{task.sealed_pack_code}</Text>
                    {renderStatusBadge(task.status)}
                </View>

                {/* Locations */}
                <View style={styles.locationContainer}>
                    <View style={styles.locationRow}>
                        <Text style={styles.locationIcon}>📍</Text>
                        <View style={styles.locationTextContainer}>
                            <Text style={styles.locationLabel}>From</Text>
                            <Text style={styles.locationValue} numberOfLines={1}>
                                {task.source_location}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.locationDivider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerArrow}>↓</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.locationRow}>
                        <Text style={styles.locationIcon}>🎯</Text>
                        <View style={styles.locationTextContainer}>
                            <Text style={styles.locationLabel}>To</Text>
                            <Text style={styles.locationValue} numberOfLines={1}>
                                {task.destination_location}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Footer with time info */}
                <View style={styles.taskFooter}>
                    <Text style={styles.timeText}>
                        ⏰ {formatTimeWindow(task.start_time, task.end_time)}
                    </Text>
                    <Text style={styles.chevron}>›</Text>
                </View>
            </TouchableOpacity>
        );
    };

    /**
     * Format time window for display
     */
    const formatTimeWindow = (start: string, end: string): string => {
        try {
            const startDate = new Date(start);
            const endDate = new Date(end);
            const options: Intl.DateTimeFormatOptions = {
                hour: '2-digit',
                minute: '2-digit',
            };
            return `${startDate.toLocaleTimeString([], options)} - ${endDate.toLocaleTimeString([], options)}`;
        } catch {
            return 'Time not available';
        }
    };

    /**
     * Render empty state
     */
    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Tasks Assigned</Text>
            <Text style={styles.emptyText}>
                You don't have any delivery tasks assigned yet.
                Pull down to refresh.
            </Text>
        </View>
    );

    /**
     * Render error state
     */
    const renderErrorState = () => (
        <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>❌</Text>
            <Text style={styles.errorTitle}>Failed to Load Tasks</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
                style={styles.retryButton}
                onPress={() => loadTasks()}
            >
                <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
        </View>
    );

    /**
     * Render loading state
     */
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4f8cff" />
                <Text style={styles.loadingText}>Loading tasks...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Welcome Banner */}
            <View style={styles.welcomeBanner}>
                <View style={styles.welcomeTextContainer}>
                    <Text style={styles.welcomeText}>
                        👋 Welcome, {user?.name || 'Agent'}!
                    </Text>
                    <Text style={styles.taskCount}>
                        {tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned
                    </Text>
                </View>
                <TouchableOpacity 
                    style={styles.noticesButton}
                    onPress={() => router.push('/(protected)/tasks/notices')}
                >
                    <Ionicons name="megaphone-outline" size={20} color="#ffffff" />
                    <Text style={styles.noticesButtonText}>Notices</Text>
                </TouchableOpacity>
            </View>

            {/* Error State */}
            {error && !isRefreshing ? (
                renderErrorState()
            ) : (
                /* Task List */
                <FlatList
                    data={tasks}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTaskCard}
                    contentContainerStyle={[
                        styles.listContent,
                        tasks.length === 0 && styles.listContentEmpty,
                    ]}
                    ListEmptyComponent={renderEmptyState}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={() => loadTasks(true)}
                            tintColor="#4f8cff"
                            colors={['#4f8cff']}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f1a',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0f0f1a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#9ca3af',
        fontSize: 14,
        marginTop: 12,
    },
    welcomeBanner: {
        backgroundColor: '#1a1a2e',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2d2d44',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    welcomeTextContainer: {
        flex: 1,
    },
    welcomeText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    },
    taskCount: {
        color: '#6b7280',
        fontSize: 14,
        marginTop: 4,
    },
    noticesButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3b82f6',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    noticesButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
    },
    listContentEmpty: {
        flex: 1,
    },
    taskCard: {
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#2d2d44',
    },
    suspiciousCard: {
        borderColor: 'rgba(239, 68, 68, 0.5)',
        borderWidth: 2,
    },
    taskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    packCode: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '700',
        fontFamily: 'monospace',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    locationContainer: {
        marginBottom: 16,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    locationIcon: {
        fontSize: 16,
        marginRight: 10,
        marginTop: 2,
    },
    locationTextContainer: {
        flex: 1,
    },
    locationLabel: {
        color: '#6b7280',
        fontSize: 12,
        marginBottom: 2,
    },
    locationValue: {
        color: '#e5e7eb',
        fontSize: 14,
    },
    locationDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
        marginVertical: 8,
    },
    dividerLine: {
        width: 1,
        height: 10,
        backgroundColor: '#3d3d5c',
    },
    dividerArrow: {
        color: '#6b7280',
        fontSize: 10,
        marginHorizontal: 4,
    },
    taskFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#2d2d44',
    },
    timeText: {
        color: '#9ca3af',
        fontSize: 13,
    },
    chevron: {
        color: '#6b7280',
        fontSize: 24,
        fontWeight: '300',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptyText: {
        color: '#6b7280',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    errorIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    errorTitle: {
        color: '#ef4444',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    errorText: {
        color: '#6b7280',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#4f8cff',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});
