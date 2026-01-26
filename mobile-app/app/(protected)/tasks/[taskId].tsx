/**
 * Task Detail Screen - PHASE 3 + PHASE 4 HARDENING
 * 
 * Full task execution with event capture.
 * 
 * Features:
 * - Task details display
 * - Step-by-step event flow (PICKUP → TRANSIT → FINAL)
 * - Camera capture integration
 * - Event submission with loading states
 * - Error handling for all backend error cases
 * 
 * SECURITY:
 * - Enforces strict event sequence
 * - No event skipping or reordering
 * - Images cleared after upload
 * 
 * PHASE 4 HARDENING:
 * - FINAL event confirmation with permanent lock warning
 * - Navigation guards during submission
 * - Network error handling
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
    Alert,
    Modal,
    BackHandler,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { fetchTaskById, fetchTaskEvents } from '../../../src/services/task.service';
import { submitEvent, EVENT_STEPS, getNextEventType } from '../../../src/services/event.service';
import { Task, TaskStatus, EventType } from '../../../src/types';
import EventCamera from '../../../src/components/EventCamera';

/**
 * Status badge colors and labels
 */
const STATUS_CONFIG: Record<TaskStatus, { color: string; bgColor: string; label: string; description: string }> = {
    PENDING: {
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.15)',
        label: 'Pending',
        description: 'Complete PICKUP event to begin delivery.',
    },
    IN_PROGRESS: {
        color: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.15)',
        label: 'In Progress',
        description: 'Delivery in progress. Complete all events.',
    },
    COMPLETED: {
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.15)',
        label: 'Completed',
        description: 'Delivery completed successfully! 🎉',
    },
    SUSPICIOUS: {
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.15)',
        label: '⚠️ Suspicious',
        description: 'Task flagged for review. Contact admin if needed.',
    },
};

export default function TaskDetailScreen() {
    const { taskId } = useLocalSearchParams<{ taskId: string }>();

    // Task state
    const [task, setTask] = useState<Task | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Event tracking
    const [completedEvents, setCompletedEvents] = useState<EventType[]>([]);
    const [currentEventType, setCurrentEventType] = useState<EventType | null>(null);

    // Camera modal
    const [showCamera, setShowCamera] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // PHASE 4: Track if we're in active submission (for navigation guard)
    const isSubmittingRef = useRef(false);

    /**
     * PHASE 4: Navigation guard - prevent back navigation during submission
     */
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (isSubmittingRef.current || showCamera) {
                    Alert.alert(
                        'Upload in Progress',
                        'Please wait for the current upload to complete before leaving.',
                        [{ text: 'OK' }]
                    );
                    return true; // Prevent default back behavior
                }
                return false; // Allow default back behavior
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => subscription.remove();
        }, [showCamera])
    );

    /**
     * Load task and events from API
     */
    const loadTask = useCallback(async (isRefresh = false) => {
        if (!taskId) {
            setError('Task ID not found');
            setIsLoading(false);
            return;
        }

        if (isRefresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        setError(null);

        // Fetch task details
        const taskResult = await fetchTaskById(taskId);

        if (taskResult.success && taskResult.task) {
            setTask(taskResult.task);

            // Fetch actual events from API
            const eventsResult = await fetchTaskEvents(taskId);

            if (eventsResult.success && eventsResult.events) {
                // Extract completed event types
                const completed = eventsResult.events.map(e => e.event_type as EventType);
                setCompletedEvents(completed);
                console.log('[Task] Loaded completed events:', completed);
            } else {
                // Fallback: infer from status if events fetch fails
                console.log('[Task] Events fetch failed, inferring from status');
                updateCompletedEventsFromStatus(taskResult.task.status);
            }
        } else {
            setError(taskResult.error || 'Failed to load task');
        }

        setIsLoading(false);
        setIsRefreshing(false);
    }, [taskId]);

    /**
     * Fallback: Infer completed events from task status.
     * Only used if events endpoint fails.
     */
    const updateCompletedEventsFromStatus = (status: TaskStatus) => {
        switch (status) {
            case 'PENDING':
                setCompletedEvents([]);
                break;
            case 'IN_PROGRESS':
                // At least first step is done
                setCompletedEvents(['PICKUP_POLICE_STATION']);
                break;
            case 'COMPLETED':
                setCompletedEvents([
                    'PICKUP_POLICE_STATION',
                    'ARRIVAL_EXAM_CENTER',
                    'OPENING_SEAL',
                    'SEALING_ANSWER_SHEETS',
                    'SUBMISSION_POST_OFFICE'
                ]);
                break;
            case 'SUSPICIOUS':
                // Keep current state
                break;
        }
    };

    /**
     * Initial load
     */
    useEffect(() => {
        loadTask();
    }, [loadTask]);

    /**
     * Start event capture.
     * PHASE 4: Show confirmation for SUBMISSION_POST_OFFICE (final) event
     */
    const startEventCapture = (eventType: EventType) => {
        // PHASE 4: Special confirmation for SUBMISSION_POST_OFFICE event (final step)
        if (eventType === 'SUBMISSION_POST_OFFICE') {
            Alert.alert(
                '⚠️ Complete Delivery',
                'This is the FINAL step. Once submitted, the task will be PERMANENTLY LOCKED and cannot be modified.\n\nAre you sure you want to complete this delivery?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Yes, Complete Delivery',
                        style: 'destructive',
                        onPress: () => {
                            setCurrentEventType(eventType);
                            setShowCamera(true);
                        }
                    }
                ]
            );
            return;
        }

        setCurrentEventType(eventType);
        setShowCamera(true);
    };

    /**
     * Handle captured photo and location.
     * PHASE 4: Track submission state for navigation guard
     */
    const handleCapture = async (imageUri: string, latitude: number, longitude: number) => {
        if (!currentEventType || !taskId) return;

        setIsSubmitting(true);
        isSubmittingRef.current = true;  // PHASE 4: For navigation guard

        try {
            console.log(`[Task] Submitting ${currentEventType} event...`);

            const result = await submitEvent(
                taskId,
                currentEventType,
                imageUri,
                latitude,
                longitude,
            );

            if (result.success) {
                // Success! Update state
                setCompletedEvents(prev => [...prev, currentEventType]);

                // Close camera
                setShowCamera(false);
                setCurrentEventType(null);

                // Show success message
                Alert.alert(
                    'Event Submitted',
                    `${currentEventType} event recorded successfully.`,
                    [{ text: 'OK' }]
                );

                // Refresh task to get updated status
                loadTask(true);

            } else {
                // Handle specific error cases
                handleEventError(result.error || 'Failed to submit event', result.errorCode);
            }

        } catch (error) {
            console.error('[Task] Event submission error:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
            isSubmittingRef.current = false;  // PHASE 4: Clear navigation guard
        }
    };

    /**
     * Handle event submission errors.
     */
    const handleEventError = (message: string, errorCode?: string) => {
        let title = 'Submission Failed';
        let alertMessage = message;

        switch (errorCode) {
            case 'DUPLICATE_EVENT':
                title = 'Already Submitted';
                alertMessage = 'This event has already been recorded.';
                // Mark as complete
                if (currentEventType) {
                    setCompletedEvents(prev => [...prev, currentEventType]);
                }
                break;

            case 'TASK_COMPLETED':
                title = 'Task Completed';
                alertMessage = 'This task is already completed and cannot be modified.';
                setCompletedEvents(['PICKUP', 'TRANSIT', 'FINAL']);
                break;

            case 'TIME_VIOLATION':
                title = '⚠️ Time Window Violation';
                alertMessage = 'This event was submitted outside the allowed time window. The task may be flagged for review.';
                break;

            case 'UNAUTHORIZED':
                title = 'Session Expired';
                alertMessage = 'Your session has expired. Please login again.';
                break;
        }

        Alert.alert(title, alertMessage, [
            {
                text: 'OK',
                onPress: () => {
                    setShowCamera(false);
                    setCurrentEventType(null);
                    // Refresh task
                    loadTask(true);
                }
            }
        ]);
    };

    /**
     * Cancel camera.
     */
    const handleCancelCamera = () => {
        setShowCamera(false);
        setCurrentEventType(null);
    };

    /**
     * Format date/time for display
     */
    const formatDateTime = (dateString: string): string => {
        try {
            const date = new Date(dateString);
            return date.toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return 'Invalid date';
        }
    };

    /**
     * Check if task can accept new events.
     * NOTE: SUSPICIOUS status does NOT block events - it's just a flag for admin review.
     * Only COMPLETED status blocks further events.
     */
    const canSubmitEvents = (): boolean => {
        if (!task) return false;
        return task.status !== 'COMPLETED';
    };

    /**
     * Check if this is an afternoon double shift (skips first 2 steps)
     */
    const isAfternoonShift = task?.is_double_shift && task?.shift_type === 'AFTERNOON';

    /**
     * Get the next event type that can be submitted.
     */
    const nextEvent = getNextEventType(completedEvents, isAfternoonShift);

    /**
     * Get filtered event steps (skip first 2 for afternoon shifts)
     */
    const filteredEventSteps = isAfternoonShift 
        ? EVENT_STEPS.filter(step => !step.skipForAfternoon)
        : EVENT_STEPS;

    /**
     * Render loading state
     */
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4f8cff" />
                <Text style={styles.loadingText}>Loading task details...</Text>
            </View>
        );
    }

    /**
     * Render error state
     */
    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>❌</Text>
                <Text style={styles.errorTitle}>Failed to Load Task</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => loadTask()}
                >
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backText}>← Back to Tasks</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!task) {
        return null;
    }

    const statusConfig = STATUS_CONFIG[task.status];
    const isSuspicious = task.status === 'SUSPICIOUS';
    const isCompleted = task.status === 'COMPLETED';

    return (
        <>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => loadTask(true)}
                        tintColor="#4f8cff"
                        colors={['#4f8cff']}
                    />
                }
            >
                {/* Status Card */}
                <View style={[
                    styles.statusCard,
                    { borderColor: statusConfig.color },
                    isSuspicious && styles.suspiciousCard,
                ]}>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>
                            {statusConfig.label}
                        </Text>
                    </View>
                    <Text style={styles.statusDescription}>{statusConfig.description}</Text>
                </View>

                {/* Pack Code Card */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>SEALED PACK CODE</Text>
                    <Text style={styles.packCode}>{task.sealed_pack_code}</Text>
                    {/* Double shift indicator */}
                    {task.is_double_shift && (
                        <View style={styles.shiftBadge}>
                            <Text style={styles.shiftText}>
                                {task.shift_type === 'MORNING' ? '🌅 Morning Shift' : '🌆 Afternoon Shift'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Event Steps */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>DELIVERY STEPS</Text>
                    {isAfternoonShift && (
                        <Text style={styles.shiftNote}>
                            ℹ️ Afternoon shift - Steps 1-2 already completed in morning
                        </Text>
                    )}

                    {filteredEventSteps.map((step, index) => {
                        const isComplete = completedEvents.includes(step.type);
                        const isActive = nextEvent === step.type && canSubmitEvents();
                        const isLocked = !isComplete && nextEvent !== step.type;
                        const prevStep = index > 0 ? filteredEventSteps[index - 1] : null;

                        return (
                            <View key={step.type} style={styles.stepContainer}>
                                {/* Connector line */}
                                {index > 0 && prevStep && (
                                    <View style={[
                                        styles.stepConnector,
                                        isComplete || (completedEvents.includes(prevStep.type))
                                            ? styles.stepConnectorComplete
                                            : styles.stepConnectorPending
                                    ]} />
                                )}

                                <View style={[
                                    styles.step,
                                    isComplete && styles.stepComplete,
                                    isActive && styles.stepActive,
                                    isLocked && styles.stepLocked,
                                ]}>
                                    <View style={[
                                        styles.stepIconContainer,
                                        isComplete && styles.stepIconComplete,
                                        isActive && styles.stepIconActive,
                                    ]}>
                                        <Text style={styles.stepIcon}>
                                            {isComplete ? '✓' : step.icon}
                                        </Text>
                                    </View>

                                    <View style={styles.stepContent}>
                                        <Text style={[
                                            styles.stepLabel,
                                            isComplete && styles.stepLabelComplete,
                                            isLocked && styles.stepLabelLocked,
                                        ]}>
                                            {step.label}
                                        </Text>
                                        <Text style={[
                                            styles.stepDescription,
                                            isLocked && styles.stepDescriptionLocked,
                                        ]}>
                                            {isComplete ? 'Completed ✓' : step.description}
                                        </Text>
                                    </View>

                                    {isActive && (
                                        <TouchableOpacity
                                            style={styles.stepButton}
                                            onPress={() => startEventCapture(step.type)}
                                        >
                                            <Text style={styles.stepButtonText}>📷 Capture</Text>
                                        </TouchableOpacity>
                                    )}

                                    {isComplete && (
                                        <View style={styles.stepCompleteCheck}>
                                            <Text style={styles.stepCompleteCheckText}>✓</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Locations Card */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>DELIVERY ROUTE</Text>

                    <View style={styles.locationRow}>
                        <View style={styles.locationIconContainer}>
                            <Text style={styles.locationIcon}>📍</Text>
                            <View style={styles.locationLine} />
                        </View>
                        <View style={styles.locationContent}>
                            <Text style={styles.locationLabel}>Pickup Location</Text>
                            <Text style={styles.locationValue}>{task.source_location}</Text>
                        </View>
                    </View>

                    <View style={styles.locationRow}>
                        <View style={styles.locationIconContainer}>
                            <Text style={styles.locationIcon}>🎯</Text>
                        </View>
                        <View style={styles.locationContent}>
                            <Text style={styles.locationLabel}>Destination</Text>
                            <Text style={styles.locationValue}>{task.destination_location}</Text>
                        </View>
                    </View>
                </View>

                {/* Time Window Card */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>TIME WINDOW</Text>

                    <View style={styles.timeRow}>
                        <View style={styles.timeItem}>
                            <Text style={styles.timeLabel}>Start After</Text>
                            <Text style={styles.timeValue}>{formatDateTime(task.start_time)}</Text>
                        </View>
                        <View style={styles.timeDivider} />
                        <View style={styles.timeItem}>
                            <Text style={styles.timeLabel}>Complete By</Text>
                            <Text style={styles.timeValue}>{formatDateTime(task.end_time)}</Text>
                        </View>
                    </View>
                </View>

                {/* Task Meta Info */}
                <View style={styles.metaCard}>
                    <Text style={styles.metaText}>Task ID: {task.id}</Text>
                    <Text style={styles.metaText}>Created: {formatDateTime(task.created_at)}</Text>
                </View>
            </ScrollView>

            {/* Camera Modal */}
            <Modal
                visible={showCamera}
                animationType="slide"
                presentationStyle="fullScreen"
            >
                {currentEventType && (
                    <EventCamera
                        eventType={currentEventType}
                        onCapture={handleCapture}
                        onCancel={handleCancelCamera}
                        isSubmitting={isSubmitting}
                    />
                )}
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f1a',
    },
    content: {
        padding: 16,
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
    errorContainer: {
        flex: 1,
        backgroundColor: '#0f0f1a',
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
        marginBottom: 12,
    },
    retryText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    backButton: {
        padding: 12,
    },
    backText: {
        color: '#6b7280',
        fontSize: 14,
    },
    statusCard: {
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 2,
        alignItems: 'center',
    },
    suspiciousCard: {
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    statusBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 12,
    },
    statusText: {
        fontSize: 16,
        fontWeight: '700',
    },
    statusDescription: {
        color: '#9ca3af',
        fontSize: 14,
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2d2d44',
    },
    cardLabel: {
        color: '#6b7280',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
        marginBottom: 16,
    },
    packCode: {
        color: '#ffffff',
        fontSize: 24,
        fontWeight: '700',
        fontFamily: 'monospace',
        textAlign: 'center',
    },
    stepContainer: {
        position: 'relative',
    },
    stepConnector: {
        position: 'absolute',
        left: 24,
        top: -16,
        width: 2,
        height: 16,
    },
    stepConnectorComplete: {
        backgroundColor: '#10b981',
    },
    stepConnectorPending: {
        backgroundColor: '#3d3d5c',
    },
    step: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(45, 45, 68, 0.3)',
    },
    stepComplete: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    stepActive: {
        backgroundColor: 'rgba(79, 140, 255, 0.15)',
        borderWidth: 1,
        borderColor: '#4f8cff',
    },
    stepLocked: {
        opacity: 0.5,
    },
    stepIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#2d2d44',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    stepIconComplete: {
        backgroundColor: '#10b981',
    },
    stepIconActive: {
        backgroundColor: '#4f8cff',
    },
    stepIcon: {
        fontSize: 20,
    },
    stepContent: {
        flex: 1,
    },
    stepLabel: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    stepLabelComplete: {
        color: '#10b981',
    },
    stepLabelLocked: {
        color: '#6b7280',
    },
    stepDescription: {
        color: '#9ca3af',
        fontSize: 13,
    },
    stepDescriptionLocked: {
        color: '#4b5563',
    },
    stepButton: {
        backgroundColor: '#4f8cff',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    stepButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    stepCompleteCheck: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepCompleteCheckText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    locationRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    locationIconContainer: {
        alignItems: 'center',
        marginRight: 12,
    },
    locationIcon: {
        fontSize: 20,
    },
    locationLine: {
        width: 2,
        height: 40,
        backgroundColor: '#3d3d5c',
        marginTop: 8,
    },
    locationContent: {
        flex: 1,
        paddingBottom: 8,
    },
    locationLabel: {
        color: '#6b7280',
        fontSize: 12,
        marginBottom: 4,
    },
    locationValue: {
        color: '#ffffff',
        fontSize: 15,
        lineHeight: 22,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeItem: {
        flex: 1,
        alignItems: 'center',
    },
    timeDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#3d3d5c',
        marginHorizontal: 16,
    },
    timeLabel: {
        color: '#6b7280',
        fontSize: 12,
        marginBottom: 6,
    },
    timeValue: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '500',
    },
    metaCard: {
        backgroundColor: 'rgba(26, 26, 46, 0.5)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    metaText: {
        color: '#6b7280',
        fontSize: 12,
        fontFamily: 'monospace',
        marginBottom: 4,
    },
    shiftBadge: {
        marginTop: 12,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(79, 140, 255, 0.15)',
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    shiftText: {
        color: '#4f8cff',
        fontSize: 13,
        fontWeight: '500',
    },
    shiftNote: {
        color: '#9ca3af',
        fontSize: 12,
        marginBottom: 12,
        fontStyle: 'italic',
    },
});
