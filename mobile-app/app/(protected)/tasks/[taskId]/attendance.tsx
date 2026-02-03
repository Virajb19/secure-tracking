/**
 * Attendance Screen - Geo-fenced Attendance for NBSE Officers
 * 
 * Features:
 * - Mark attendance at PICKUP or DESTINATION location
 * - Geo-fence validation (shows distance from target)
 * - Photo capture with GPS verification
 * - View attendance history
 */

import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { fetchTaskById } from '../../../../src/services/task.service';
import { markAttendance, fetchTaskAttendance, AttendanceRecord } from '../../../../src/services/attendance.service';
import AttendanceCamera from '../../../../src/components/AttendanceCamera';
import { Task } from '../../../../src/types';

type LocationType = 'PICKUP' | 'DESTINATION';

export default function AttendanceScreen() {
    const { taskId } = useLocalSearchParams<{ taskId: string }>();

    // Task state
    const [task, setTask] = useState<Task | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Attendance state
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [showCamera, setShowCamera] = useState(false);
    const [currentLocationType, setCurrentLocationType] = useState<LocationType | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    /**
     * Load task and attendance records
     */
    const loadData = useCallback(async (isRefresh = false) => {
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

        try {
            // Fetch task
            const taskResult = await fetchTaskById(taskId);
            if (taskResult.success && taskResult.task) {
                setTask(taskResult.task);
            } else {
                setError(taskResult.error || 'Failed to load task');
                return;
            }

            // Fetch attendance records
            const attendanceResult = await fetchTaskAttendance(taskId);
            if (attendanceResult.success && attendanceResult.attendance) {
                setAttendanceRecords(attendanceResult.attendance);
            }
        } catch (err) {
            setError('Failed to load data');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [taskId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    /**
     * Check if attendance already marked for a location
     */
    const isAttendanceMarked = (locationType: LocationType): boolean => {
        return attendanceRecords.some(r => r.location_type === locationType);
    };

    /**
     * Get attendance record for a location
     */
    const getAttendanceRecord = (locationType: LocationType): AttendanceRecord | undefined => {
        return attendanceRecords.find(r => r.location_type === locationType);
    };

    /**
     * Start marking attendance
     */
    const startMarkAttendance = (locationType: LocationType) => {
        if (isAttendanceMarked(locationType)) {
            Alert.alert('Already Marked', `Attendance for ${locationType.toLowerCase()} is already marked.`);
            return;
        }
        setCurrentLocationType(locationType);
        setShowCamera(true);
    };

    /**
     * Handle photo capture
     */
    const handleCapture = async (imageUri: string, latitude: number, longitude: number) => {
        if (!currentLocationType || !taskId) return;

        setIsSubmitting(true);

        try {
            const result = await markAttendance(
                taskId,
                currentLocationType,
                imageUri,
                latitude,
                longitude,
            );

            if (result.success) {
                setShowCamera(false);
                setCurrentLocationType(null);

                Alert.alert(
                    'Attendance Marked',
                    result.message || 'Your attendance has been recorded.',
                    [{ text: 'OK' }]
                );

                // Refresh data
                loadData(true);
            } else {
                Alert.alert('Error', result.error || 'Failed to mark attendance');
            }
        } catch (err) {
            Alert.alert('Error', 'An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Close camera
     */
    const handleCancelCamera = () => {
        setShowCamera(false);
        setCurrentLocationType(null);
    };

    /**
     * Format timestamp
     */
    const formatTime = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Loading state
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4f8cff" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    // Error state
    if (error || !task) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>❌</Text>
                <Text style={styles.errorText}>{error || 'Task not found'}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => loadData()}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backText}>← Back to Tasks</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const pickupRecord = getAttendanceRecord('PICKUP');
    const destinationRecord = getAttendanceRecord('DESTINATION');

    return (
        <>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => loadData(true)}
                        tintColor="#4f8cff"
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backButton}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>📍 Attendance</Text>
                </View>

                {/* Task Info */}
                <View style={styles.taskInfo}>
                    <Text style={styles.packCode}>{task.sealed_pack_code}</Text>
                    <Text style={styles.taskRoute}>
                        {task.source_location} → {task.destination_location}
                    </Text>
                </View>

                {/* Pickup Attendance */}
                <View style={styles.attendanceCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardIcon}>📍</Text>
                        <Text style={styles.cardTitle}>Pickup Location</Text>
                    </View>
                    <Text style={styles.locationText}>{task.source_location}</Text>

                    {pickupRecord ? (
                        <View style={styles.attendanceStatus}>
                            <View style={[
                                styles.statusBadge,
                                pickupRecord.is_within_geofence ? styles.statusGreen : styles.statusOrange
                            ]}>
                                <Text style={styles.statusText}>
                                    {pickupRecord.is_within_geofence ? '✅ Within Area' : '⚠️ Outside Area'}
                                </Text>
                            </View>
                            <Text style={styles.timeText}>
                                Marked at {formatTime(pickupRecord.timestamp)}
                            </Text>
                            {pickupRecord.distance_from_target && (
                                <Text style={styles.distanceText}>
                                    Distance: {pickupRecord.distance_from_target}m
                                </Text>
                            )}
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.markButton}
                            onPress={() => startMarkAttendance('PICKUP')}
                        >
                            <Text style={styles.markButtonText}>📸 Mark Attendance</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Destination Attendance */}
                <View style={styles.attendanceCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardIcon}>🎯</Text>
                        <Text style={styles.cardTitle}>Destination</Text>
                    </View>
                    <Text style={styles.locationText}>{task.destination_location}</Text>

                    {destinationRecord ? (
                        <View style={styles.attendanceStatus}>
                            <View style={[
                                styles.statusBadge,
                                destinationRecord.is_within_geofence ? styles.statusGreen : styles.statusOrange
                            ]}>
                                <Text style={styles.statusText}>
                                    {destinationRecord.is_within_geofence ? '✅ Within Area' : '⚠️ Outside Area'}
                                </Text>
                            </View>
                            <Text style={styles.timeText}>
                                Marked at {formatTime(destinationRecord.timestamp)}
                            </Text>
                            {destinationRecord.distance_from_target && (
                                <Text style={styles.distanceText}>
                                    Distance: {destinationRecord.distance_from_target}m
                                </Text>
                            )}
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.markButton}
                            onPress={() => startMarkAttendance('DESTINATION')}
                        >
                            <Text style={styles.markButtonText}>📸 Mark Attendance</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Info Notice */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoIcon}>ℹ️</Text>
                    <Text style={styles.infoText}>
                        Your attendance photo and location will be recorded for verification.
                        Make sure you are at the designated location before marking attendance.
                    </Text>
                </View>
            </ScrollView>

            {/* Camera Modal */}
            <Modal
                visible={showCamera}
                animationType="slide"
                presentationStyle="fullScreen"
            >
                {currentLocationType && task && (
                    <AttendanceCamera
                        locationType={currentLocationType}
                        targetLat={(task as any).pickup_latitude ? Number((task as any).pickup_latitude) : undefined}
                        targetLng={(task as any).pickup_longitude ? Number((task as any).pickup_longitude) : undefined}
                        geofenceRadius={(task as any).geofence_radius || 100}
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
        paddingBottom: 32,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0f0f1a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#9ca3af',
        fontSize: 16,
        marginTop: 12,
    },
    errorContainer: {
        flex: 1,
        backgroundColor: '#0f0f1a',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    errorIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#4f8cff',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    retryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    backText: {
        color: '#6b7280',
        fontSize: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingTop: 8,
    },
    backButton: {
        color: '#4f8cff',
        fontSize: 16,
        marginRight: 16,
    },
    headerTitle: {
        color: '#ffffff',
        fontSize: 22,
        fontWeight: '700',
    },
    taskInfo: {
        backgroundColor: '#1a1a2e',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    packCode: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'monospace',
        marginBottom: 8,
    },
    taskRoute: {
        color: '#9ca3af',
        fontSize: 14,
    },
    attendanceCard: {
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2d2d44',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardIcon: {
        fontSize: 20,
        marginRight: 8,
    },
    cardTitle: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    },
    locationText: {
        color: '#9ca3af',
        fontSize: 14,
        marginBottom: 16,
    },
    attendanceStatus: {
        backgroundColor: 'rgba(45, 45, 68, 0.5)',
        borderRadius: 8,
        padding: 12,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginBottom: 8,
    },
    statusGreen: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
    },
    statusOrange: {
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    timeText: {
        color: '#9ca3af',
        fontSize: 13,
    },
    distanceText: {
        color: '#6b7280',
        fontSize: 12,
        marginTop: 4,
    },
    markButton: {
        backgroundColor: '#4f8cff',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    markButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    infoCard: {
        backgroundColor: 'rgba(79, 140, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    infoIcon: {
        fontSize: 18,
        marginRight: 12,
    },
    infoText: {
        flex: 1,
        color: '#9ca3af',
        fontSize: 13,
        lineHeight: 20,
    },
});
