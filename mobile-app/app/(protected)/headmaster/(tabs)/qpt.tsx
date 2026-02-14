/**
 * Question Paper Tracker (QPT) Tab - Headmaster / Center Superintendent
 * 
 * Shows 5 tracker steps for question paper tracking with photo submission.
 * UI matches NBSE CONNECT design from screenshots.
 * 
 * Steps:
 * 1. Centre Superintendent at Treasury Office/Bank (7:30-8:40 AM)
 * 2. Custodian to Centre Superintendent (7:30-8:40 AM)
 * 3. Opening of Question Paper at Centre's control room (8:30-9:00 AM)
 * 4. Packing & Sealing of Answerbooks - after exam (12:00/11:00 - 2:00 PM)
 * 5. Delivery of packets at Post Offices (12:00/11:00 - 2:00 PM)
 * 
 * Time-frame restrictions enforced:
 * - Core subjects: packing/delivery from 12:00 PM
 * - Vocational subjects: packing/delivery from 11:00 AM
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Image,
    Modal,
    Dimensions,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../src/contexts/AuthContext';
import {
    getEventSummary,
    submitEvent,
    ExamTrackerEventType,
    EventDetail,
} from '../../../../src/services/exam-tracker.service';
import {
    getTimeWindows,
    isWithinTimeWindowLocal,
    TrackerTimeWindows,
    TimeWindow,
    ExamScheduleEntry,
    getExamDayStatus,
} from '../../../../src/services/exam-scheduler.service';
import { API_CONFIG } from '../../../../src/constants/config';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

// ─── Event configuration matching NBSE CONNECT screenshots ──────────────
interface TrackerEventConfig {
    id: ExamTrackerEventType;
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    shift: 'GENERAL' | 'MORNING';
    timeWindowKey: keyof TrackerTimeWindows;
}

const TRACKER_EVENTS: TrackerEventConfig[] = [
    {
        id: ExamTrackerEventType.TREASURY_ARRIVAL,
        title: 'Center Superintendent at the Treasury Office / Bank',
        description: 'The Center Superintendent must click a picture when reaching the Treasury Office / Bank',
        icon: 'business-outline',
        shift: 'GENERAL',
        timeWindowKey: 'TREASURY_ARRIVAL',
    },
    {
        id: ExamTrackerEventType.CUSTODIAN_HANDOVER,
        title: 'Custodian to Center Superintendent',
        description: 'The Center Superintendent must click a picture when receiving the question papers at the Treasury Office / Bank',
        icon: 'people-outline',
        shift: 'GENERAL',
        timeWindowKey: 'CUSTODIAN_HANDOVER',
    },
    {
        id: ExamTrackerEventType.OPENING_MORNING,
        title: "Opening of Question Paper at Center's control room",
        description: "The Center Superintendent must click a picture on opening the question papers at the Center's Control Room",
        icon: 'mail-open-outline',
        shift: 'MORNING',
        timeWindowKey: 'OPENING',
    },
    {
        id: ExamTrackerEventType.PACKING_MORNING,
        title: 'Packing & Sealing of Answerbooks (after exam)',
        description: "Packing and sealing of answer books must be done at the given time and must take a picture at Centre's Control Room",
        icon: 'cube-outline',
        shift: 'MORNING',
        timeWindowKey: 'PACKING',
    },
    {
        id: ExamTrackerEventType.DELIVERY_MORNING,
        title: 'Delivery of packets at Post Offices',
        description: 'While delivering the Answerbooks the Centre Superintendent must click a picture while submitting at the Post Office',
        icon: 'send-outline',
        shift: 'MORNING',
        timeWindowKey: 'DELIVERY',
    },
];

// ─── Format helpers ─────────────────────────────────────────────────────
function formatSubmissionTime(dateStr: string): string {
    const date = new Date(dateStr);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');

    const day = date.getDate();
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    const suffix =
        day === 1 || day === 21 || day === 31 ? 'st' :
            day === 2 || day === 22 ? 'nd' :
                day === 3 || day === 23 ? 'rd' : 'th';

    return `${displayHours}:${displayMinutes}${ampm}, ${day}${suffix} ${month}, ${year}`;
}

// ─── Event Card Component (matching screenshots) ───────────────────────
interface EventCardProps {
    event: TrackerEventConfig;
    eventDetail?: EventDetail;
    timeWindow?: TimeWindow;
    isWithinWindow: boolean;
    onSubmit: (event: TrackerEventConfig) => void;
    onViewImage: (imageUrl: string) => void;
    submittingEventId: string | null;
}

function EventCard({
    event,
    eventDetail,
    timeWindow,
    isWithinWindow,
    onSubmit,
    onViewImage,
    submittingEventId,
}: EventCardProps) {
    const isCompleted = eventDetail?.completed ?? false;
    const isThisSubmitting = submittingEventId === event.id;
    const timeWindowLabel = timeWindow?.label || '';

    return (
        <TouchableOpacity
            style={styles.eventCard}
            onPress={() => {
                if (isCompleted && eventDetail?.image_url) {
                    onViewImage(eventDetail.image_url);
                } else if (!isCompleted) {
                    onSubmit(event);
                }
            }}
            disabled={isThisSubmitting}
            activeOpacity={0.7}
        >
            {/* Header row: icon + title + check/chevron */}
            <View style={styles.eventHeader}>
                <View style={styles.eventIconContainer}>
                    <Ionicons name={event.icon} size={24} color="#374151" />
                </View>
                <Text style={styles.eventTitle}>{event.title}</Text>
                {isCompleted ? (
                    <View style={styles.checkCircle}>
                        <Ionicons name="checkmark-circle" size={28} color="#10b981" />
                    </View>
                ) : (
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                )}
            </View>

            {/* Completed: show submitted time + location */}
            {isCompleted && eventDetail?.submitted_at && (
                <View style={styles.completedInfo}>
                    <Text style={styles.completedTime}>
                        {formatSubmissionTime(eventDetail.submitted_at)}
                    </Text>
                    {(eventDetail as any)?.latitude && (eventDetail as any)?.longitude && (
                        <View style={styles.locationRow}>
                            <Ionicons name="location-outline" size={16} color="#6b7280" />
                            <Text style={styles.locationText} numberOfLines={3}>
                                {(eventDetail as any).address ||
                                    `Lat: ${Number((eventDetail as any).latitude).toFixed(4)}, Lng: ${Number((eventDetail as any).longitude).toFixed(4)}`}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* Not completed: show description with time window */}
            {!isCompleted && (
                <View style={styles.descriptionBox}>
                    <Text style={styles.descriptionText}>
                        {event.description}, between {timeWindowLabel}
                    </Text>
                    {!isWithinWindow && (
                        <View style={styles.timeRestrictionBadge}>
                            <Ionicons name="time-outline" size={14} color="#dc2626" />
                            <Text style={styles.timeRestrictionText}>
                                Outside allowed time window
                            </Text>
                        </View>
                    )}
                    {isThisSubmitting && (
                        <View style={styles.submittingRow}>
                            <ActivityIndicator size="small" color="#3b82f6" />
                            <Text style={styles.submittingText}>Submitting...</Text>
                        </View>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
}

// ─── Main QPT Screen ────────────────────────────────────────────────────
export default function QPTTabScreen() {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [submittingEventId, setSubmittingEventId] = useState<string | null>(null);

    const today = new Date().toISOString().split('T')[0];

    // Check if today is an exam day for this CS
    const {
        data: examDayResult,
        isLoading: loadingExamDay,
    } = useQuery({
        queryKey: ['exam-day-status'],
        queryFn: () => getExamDayStatus(),
        enabled: user?.is_center_superintendent ?? false,
    });

    const isExamDay = examDayResult?.data?.isExamDay ?? false;
    const nextExamDate = examDayResult?.data?.nextExamDate ?? null;
    const todaySchedules: ExamScheduleEntry[] = (examDayResult?.data?.todaySchedules || []) as ExamScheduleEntry[];
    const upcomingExams: ExamScheduleEntry[] = (examDayResult?.data?.upcomingSchedules || []) as ExamScheduleEntry[];

    // Fetch event summary
    const {
        data: summaryResult,
        isLoading: loadingSummary,
        refetch: refetchSummary,
        isRefetching,
    } = useQuery({
        queryKey: ['exam-tracker-summary', today],
        queryFn: () => getEventSummary(today),
        enabled: (user?.is_center_superintendent ?? false) && isExamDay,
    });

    // Fetch time windows from scheduler
    const { data: timeWindowsResult, isLoading: loadingWindows } = useQuery({
        queryKey: ['exam-scheduler-time-windows', today],
        queryFn: () => getTimeWindows(today),
        enabled: (user?.is_center_superintendent ?? false) && isExamDay,
    });

    const eventDetails: Partial<Record<ExamTrackerEventType, EventDetail>> =
        summaryResult?.data?.eventDetails || {};
    const timeWindows = timeWindowsResult?.data?.time_windows;
    const bypassTimeCheck = timeWindowsResult?.data?.bypass_time_check ?? false;
    const subjectCategory =
        timeWindowsResult?.data?.subject_category ||
        (summaryResult?.data as any)?.subjectCategory ||
        'CORE';

    const completedCount = summaryResult?.data?.completedEvents?.length || 0;
    const allStepsCompleted = completedCount >= TRACKER_EVENTS.length;

    // ─── Submit event handler ───────────────────────────────────────
    const handleSubmitEvent = async (event: TrackerEventConfig) => {
        // Prevent duplicate uploads
        if (eventDetails[event.id]?.completed) {
            Alert.alert('Already Submitted', `"${event.title}" has already been uploaded for today. You cannot upload the same photo twice.`);
            return;
        }

        // Sequential order check: previous step must be completed first
        const eventIndex = TRACKER_EVENTS.findIndex(e => e.id === event.id);
        if (eventIndex > 0) {
            const previousEvent = TRACKER_EVENTS[eventIndex - 1];
            if (!eventDetails[previousEvent.id]?.completed) {
                Alert.alert(
                    'Step Not Completed',
                    `You must complete "${previousEvent.title}" before proceeding to "${event.title}". Please upload the photos in sequence.`,
                );
                return;
            }
        }

        // Client-side time check
        if (timeWindows) {
            const tw = timeWindows[event.timeWindowKey];
            if (!isWithinTimeWindowLocal(tw, bypassTimeCheck)) {
                Alert.alert(
                    'Time Restriction',
                    `This event can only be submitted between ${tw.label}. Please wait until the allowed time window.`,
                );
                return;
            }
        }

        try {
            // Request permissions
            const camPerm = await ImagePicker.requestCameraPermissionsAsync();
            if (!camPerm.granted) {
                Alert.alert('Permission Required', 'Camera access is needed to take evidence photos.');
                return;
            }

            const locPerm = await Location.requestForegroundPermissionsAsync();
            if (locPerm.status !== 'granted') {
                Alert.alert('Permission Required', 'Location access is needed to verify the photo location.');
                return;
            }

            // Launch camera
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.8,
                allowsEditing: false,
            });

            if (result.canceled || !result.assets?.[0]) return;

            const photoUri = result.assets[0].uri;

            // Get GPS
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            setSubmittingEventId(event.id);

            // Submit to backend
            const submitResult = await submitEvent(
                event.id,
                today,
                photoUri,
                location.coords.latitude,
                location.coords.longitude,
                event.shift,
            );

            if (submitResult.success) {
                // Check if this was the last step
                const currentCompleted = summaryResult?.data?.completedEvents?.length || 0;
                if (currentCompleted + 1 >= TRACKER_EVENTS.length) {
                    Alert.alert(
                        '🎉 All Steps Completed!',
                        'Congratulations! You have successfully completed all Question Paper Tracking steps for today. All photos have been uploaded and verified.',
                    );
                } else {
                    Alert.alert('Success', `${event.title} submitted successfully!`);
                }
                queryClient.invalidateQueries({ queryKey: ['exam-tracker-summary'] });
                refetchSummary();
            } else {
                Alert.alert('Failed', submitResult.error || 'Submission failed. Please try again.');
            }
        } catch (err: any) {
            console.error('[QPT] Submit error:', err);
            Alert.alert('Error', err?.message || 'An unexpected error occurred.');
        } finally {
            setSubmittingEventId(null);
        }
    };

    // ─── Handle view image ──────────────────────────────────────────
    const handleViewImage = (imageUrl: string) => {
        const fullUrl = imageUrl.startsWith('http')
            ? imageUrl
            : `${API_CONFIG.BASE_URL}${imageUrl}`;
        setSelectedImage(fullUrl);
    };

    // ─── Access guard ───────────────────────────────────────────────
    if (!user?.is_center_superintendent) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="lock-closed-outline" size={64} color="#9ca3af" />
                <Text style={styles.noAccessTitle}>Access Restricted</Text>
                <Text style={styles.noAccessText}>
                    You need to be assigned as a Center Superintendent to access Question Paper Tracking.
                </Text>
            </View>
        );
    }

    // ─── Loading exam day status ────────────────────────────────────
    if (loadingExamDay) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#374151" />
                <Text style={styles.loadingText}>Checking exam schedule...</Text>
            </View>
        );
    }

    // ─── Locked: Not exam day ───────────────────────────────────────
    if (!isExamDay) {
        const formatExamDate = (dateStr: string) => {
            const date = new Date(dateStr + 'T00:00:00');
            const day = date.getDate();
            const months = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December',
            ];
            const suffix =
                day === 1 || day === 21 || day === 31 ? 'st' :
                    day === 2 || day === 22 ? 'nd' :
                        day === 3 || day === 23 ? 'rd' : 'th';
            return `${day}${suffix} ${months[date.getMonth()]}, ${date.getFullYear()}`;
        };

        return (
            <View style={styles.centerContainer}>
                <View style={styles.lockedIconContainer}>
                    <Ionicons name="lock-closed" size={48} color="#f59e0b" />
                </View>
                <Text style={styles.noAccessTitle}>Not Available Yet</Text>
                <Text style={styles.noAccessText}>
                    {nextExamDate
                        ? `Question Paper Tracking will be available on ${formatExamDate(nextExamDate)}. Please check back on the exam date.`
                        : 'No upcoming exams are scheduled for your exam center. Contact your admin for more information.'}
                </Text>
                {nextExamDate && (
                    <View style={styles.nextExamBadge}>
                        <Ionicons name="calendar-outline" size={18} color="#2563eb" />
                        <Text style={styles.nextExamText}>Next Exam: {formatExamDate(nextExamDate)}</Text>
                    </View>
                )}
            </View>
        );
    }

    // ─── Loading ────────────────────────────────────────────────────
    if (loadingSummary || loadingWindows) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#374151" />
                <Text style={styles.loadingText}>Loading tracker...</Text>
            </View>
        );
    }

    // completedCount already computed above

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={() => refetchSummary()} />
                }
            >
                {/* Header */}
                <Text style={styles.headerTitle}>Question Paper Tracker</Text>
                <Text style={styles.headerSubtitle}>
                    Please make sure all the required steps are timely submitted
                </Text>

                {/* Vocational notice */}
                {subjectCategory === 'VOCATIONAL' && (
                    <View style={styles.vocationalBadge}>
                        <Ionicons name="information-circle-outline" size={16} color="#7c3aed" />
                        <Text style={styles.vocationalText}>
                            Vocational subject today — Packing & Delivery allowed from 11:00 AM
                        </Text>
                    </View>
                )}

                {/* Event Cards */}
                {TRACKER_EVENTS.map((event) => {
                    const tw = timeWindows?.[event.timeWindowKey];
                    const isWithinWindow = tw ? isWithinTimeWindowLocal(tw, bypassTimeCheck) : true;

                    return (
                        <EventCard
                            key={event.id}
                            event={event}
                            eventDetail={eventDetails[event.id]}
                            timeWindow={tw}
                            isWithinWindow={isWithinWindow}
                            onSubmit={handleSubmitEvent}
                            onViewImage={handleViewImage}
                            submittingEventId={submittingEventId}
                        />
                    );
                })}

                {/* Progress + Exam Details */}
                <View style={styles.progressCard}>
                    {todaySchedules.length > 0 && (
                        <View style={styles.examDetailsBox}>
                            <Ionicons name="school-outline" size={18} color="#2563eb" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.examDetailsTitle}>Today's Exam</Text>
                                {todaySchedules.map((s, idx) => (
                                    <Text key={idx} style={styles.examDetailsText}>
                                        {s.subject} — {s.class === 'CLASS_10' ? 'Class 10' : 'Class 12'} ({s.subject_category})
                                    </Text>
                                ))}
                            </View>
                        </View>
                    )}
                    <Text style={styles.progressText}>
                        {completedCount} of {TRACKER_EVENTS.length} steps completed
                    </Text>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${(completedCount / TRACKER_EVENTS.length) * 100}%` },
                            ]}
                        />
                    </View>
                </View>

                {/* All Steps Completed Banner */}
                {allStepsCompleted && (
                    <View style={styles.completionBanner}>
                        <View style={styles.completionIconContainer}>
                            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                        </View>
                        <Text style={styles.completionTitle}>All Steps Completed! 🎉</Text>
                        <Text style={styles.completionSubtitle}>
                            You have successfully completed all Question Paper Tracking steps for today.
                            All photos have been uploaded and verified.
                        </Text>

                        {/* Upcoming Exams */}
                        {upcomingExams.length > 0 && (
                            <View style={styles.upcomingSection}>
                                <Text style={styles.upcomingSectionTitle}>
                                    <Ionicons name="calendar-outline" size={16} color="#374151" />
                                    {'  '}Upcoming Exams
                                </Text>
                                {upcomingExams.map((exam: ExamScheduleEntry) => {
                                    const examDate = new Date(exam.exam_date.split('T')[0] + 'T00:00:00');
                                    const day = examDate.getDate();
                                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                    const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
                                    const dateLabel = `${day}${suffix} ${months[examDate.getMonth()]}`;
                                    const classLabel = exam.class === 'CLASS_10' ? 'Class 10' : 'Class 12';
                                    return (
                                        <View key={exam.id} style={styles.upcomingExamRow}>
                                            <View style={styles.upcomingDateBadge}>
                                                <Text style={styles.upcomingDateText}>{dateLabel}</Text>
                                            </View>
                                            <View style={styles.upcomingExamInfo}>
                                                <Text style={styles.upcomingSubject}>{exam.subject}</Text>
                                                <Text style={styles.upcomingMeta}>{classLabel} • {exam.subject_category}</Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {upcomingExams.length === 0 && (
                            <View style={styles.noUpcomingBox}>
                                <Ionicons name="checkmark-done-circle-outline" size={24} color="#6b7280" />
                                <Text style={styles.noUpcomingText}>No more upcoming exams scheduled.</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Image Preview Modal */}
            <Modal
                visible={!!selectedImage}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setSelectedImage(null)}
                >
                    <View style={styles.modalContent}>
                        {selectedImage && (
                            <Image
                                source={{ uri: selectedImage }}
                                style={styles.modalImage}
                                resizeMode="contain"
                            />
                        )}
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setSelectedImage(null)}
                        >
                            <Ionicons name="close-circle" size={36} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────
const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    scrollContent: {
        padding: 16,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        backgroundColor: '#f3f4f6',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6b7280',
    },
    noAccessTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#374151',
        marginTop: 16,
    },
    noAccessText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 8,
    },
    lockedIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fef3c7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    nextExamBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 20,
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: '#eff6ff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    nextExamText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2563eb',
    },

    // Header
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 16,
    },

    // Vocational badge
    vocationalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ede9fe',
        padding: 10,
        borderRadius: 10,
        marginBottom: 16,
        gap: 8,
    },
    vocationalText: {
        fontSize: 13,
        color: '#7c3aed',
        flex: 1,
    },

    // Event Card
    eventCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    eventHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 10,
    },
    eventIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    eventTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#2563eb',
        lineHeight: 22,
    },
    checkCircle: {
        marginLeft: 8,
    },

    // Completed info
    completedInfo: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    completedTime: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 6,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 4,
    },
    locationText: {
        fontSize: 13,
        color: '#6b7280',
        flex: 1,
        lineHeight: 18,
    },

    // Description box
    descriptionBox: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        backgroundColor: '#fafafa',
    },
    descriptionText: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 20,
    },
    timeRestrictionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: '#fef2f2',
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    timeRestrictionText: {
        fontSize: 12,
        color: '#dc2626',
        fontWeight: '500',
    },
    submittingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    submittingText: {
        fontSize: 13,
        color: '#3b82f6',
        fontWeight: '500',
    },

    // Progress
    progressCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    examDetailsBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 14,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    examDetailsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2563eb',
        marginBottom: 2,
    },
    examDetailsText: {
        fontSize: 13,
        color: '#374151',
        lineHeight: 20,
    },
    progressText: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 10,
        textAlign: 'center',
    },
    progressBar: {
        height: 6,
        backgroundColor: '#e5e7eb',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#10b981',
        borderRadius: 3,
    },

    // Completion Banner
    completionBanner: {
        backgroundColor: '#f0fdf4',
        borderRadius: 16,
        padding: 24,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#bbf7d0',
        alignItems: 'center',
    },
    completionIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#dcfce7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    completionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#166534',
        marginBottom: 8,
    },
    completionSubtitle: {
        fontSize: 14,
        color: '#4b5563',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 4,
    },
    upcomingSection: {
        width: '100%',
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#d1fae5',
    },
    upcomingSectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    upcomingExamRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    upcomingDateBadge: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginRight: 12,
    },
    upcomingDateText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#2563eb',
    },
    upcomingExamInfo: {
        flex: 1,
    },
    upcomingSubject: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    upcomingMeta: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    noUpcomingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#f9fafb',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    noUpcomingText: {
        fontSize: 13,
        color: '#6b7280',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalImage: {
        width: screenWidth,
        height: screenWidth,
    },
    modalCloseButton: {
        position: 'absolute',
        top: 50,
        right: 20,
    },
});
