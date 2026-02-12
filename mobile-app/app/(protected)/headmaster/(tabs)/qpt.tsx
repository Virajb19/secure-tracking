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

    // Fetch event summary
    const {
        data: summaryResult,
        isLoading: loadingSummary,
        refetch: refetchSummary,
        isRefetching,
    } = useQuery({
        queryKey: ['exam-tracker-summary', today],
        queryFn: () => getEventSummary(today),
        enabled: user?.is_center_superintendent ?? false,
    });

    // Fetch time windows from scheduler
    const { data: timeWindowsResult, isLoading: loadingWindows } = useQuery({
        queryKey: ['exam-scheduler-time-windows', today],
        queryFn: () => getTimeWindows(today),
        enabled: user?.is_center_superintendent ?? false,
    });

    const eventDetails: Partial<Record<ExamTrackerEventType, EventDetail>> =
        summaryResult?.data?.eventDetails || {};
    const timeWindows = timeWindowsResult?.data?.time_windows;
    const subjectCategory =
        timeWindowsResult?.data?.subject_category ||
        (summaryResult?.data as any)?.subjectCategory ||
        'CORE';

    // ─── Submit event handler ───────────────────────────────────────
    const handleSubmitEvent = async (event: TrackerEventConfig) => {
        // Client-side time check
        if (timeWindows) {
            const tw = timeWindows[event.timeWindowKey];
            if (!isWithinTimeWindowLocal(tw)) {
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
                Alert.alert('Success', `${event.title} submitted successfully!`);
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

    // ─── Loading ────────────────────────────────────────────────────
    if (loadingSummary || loadingWindows) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#374151" />
                <Text style={styles.loadingText}>Loading tracker...</Text>
            </View>
        );
    }

    const completedCount = summaryResult?.data?.completedEvents?.length || 0;

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
                    const isWithinWindow = tw ? isWithinTimeWindowLocal(tw) : true;

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

                {/* Progress */}
                <View style={styles.progressCard}>
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
