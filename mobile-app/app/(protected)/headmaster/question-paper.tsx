/**
 * Question Paper Tracker Screen - Headmaster/Principal
 * 
 * Displays question paper tracking events organized by shifts.
 * Shows morning and afternoon shift activities for exam centers.
 * Uses real API data to show completion status of each event.
 */

import React, { useCallback, useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { 
    getEventSummary, 
    ExamTrackerEventType,
    EventDetail,
} from '../../../src/services/exam-tracker.service';
import { API_CONFIG } from '../../../src/constants/config';

// Event configuration with display information
interface TrackerEventConfig {
    id: ExamTrackerEventType;
    title: string;
    description: string;
    shift: 'MORNING' | 'AFTERNOON' | 'GENERAL';
    icon: keyof typeof Ionicons.glyphMap;
    time_window: string;
}

// Predefined tracker events for compartmental exams
const TRACKER_EVENTS: TrackerEventConfig[] = [
    {
        id: ExamTrackerEventType.TREASURY_ARRIVAL,
        title: 'Center Superintendent at the Treasury Office / Bank',
        description: 'The Center Superintendent must click a picture when reached at the Treasury Office or Bank',
        shift: 'GENERAL',
        icon: 'business-outline',
        time_window: '7:30 AM to 8:40 AM',
    },
    {
        id: ExamTrackerEventType.CUSTODIAN_HANDOVER,
        title: 'Custodian to Center Superintendent',
        description: 'The Center Superintendent must click a picture when receiving the question papers at the Treasury Office / Bank',
        shift: 'GENERAL',
        icon: 'people-outline',
        time_window: '7:30 AM to 8:40 AM',
    },
    {
        id: ExamTrackerEventType.OPENING_MORNING,
        title: 'Opening of Question Paper at Center\'s control room (Morning Shift)',
        description: 'The Center Superintendent must click a picture on opening the question papers at the Center\'s Control Room',
        shift: 'MORNING',
        icon: 'mail-open-outline',
        time_window: '8:30 AM to 9:00 AM',
    },
    {
        id: ExamTrackerEventType.PACKING_MORNING,
        title: 'Packing & Sealing of Answerbooks, after exam - (Morning Shift)',
        description: 'The Center Superintendent must click a picture after packing & sealing of Answerbooks at the Center\'s Control Room',
        shift: 'MORNING',
        icon: 'cube-outline',
        time_window: '12:00 Noon to 2:00 PM',
    },
    {
        id: ExamTrackerEventType.DELIVERY_MORNING,
        title: 'Delivery of packets at Post Offices (Morning Shift)',
        description: 'The Center Superintendent must click a picture on delivering the Answerbooks at the Post Office',
        shift: 'MORNING',
        icon: 'send-outline',
        time_window: '12:00 Noon to 2:00 PM',
    },
    {
        id: ExamTrackerEventType.OPENING_AFTERNOON,
        title: 'Opening of Question Paper at Center\'s control room (Afternoon Shift)',
        description: 'The Center Superintendent must click a picture before opening the question papers at the Center\'s Control Room',
        shift: 'AFTERNOON',
        icon: 'mail-open-outline',
        time_window: '12:20 PM to 1:00 PM',
    },
    {
        id: ExamTrackerEventType.PACKING_AFTERNOON,
        title: 'Packing & Sealing of Answerbooks, after exam - (Afternoon Shift)',
        description: 'The Center Superintendent must click a picture after packing & sealing of Answerbooks at the Center\'s Control Room',
        shift: 'AFTERNOON',
        icon: 'cube-outline',
        time_window: '3:00 PM to 5:00 PM',
    },
    {
        id: ExamTrackerEventType.DELIVERY_AFTERNOON,
        title: 'Delivery of packets at Post Offices (Afternoon Shift)',
        description: 'The Center Superintendent must click a picture on delivering the Answerbooks at the Post Office',
        shift: 'AFTERNOON',
        icon: 'send-outline',
        time_window: '4:00 PM to 5:00 PM',
    },
];

interface EventCardProps {
    event: TrackerEventConfig;
    eventDetail?: EventDetail;
    onViewImage?: (imageUrl: string) => void;
}

function EventCard({ event, eventDetail, onViewImage }: EventCardProps) {
    const shiftLabel = event.shift === 'MORNING' ? 'for the Morning Shift' : 
                       event.shift === 'AFTERNOON' ? 'for the Afternoon Shift' : '';
    
    const isCompleted = eventDetail?.completed ?? false;
    const submittedAt = eventDetail?.submitted_at;
    const imageUrl = eventDetail?.image_url;
    
    const formatTime = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    };

    return (
        <View style={[styles.eventCard, isCompleted && styles.eventCardCompleted]}>
            <View style={styles.eventHeader}>
                <View style={[
                    styles.iconContainer, 
                    isCompleted && styles.iconContainerCompleted
                ]}>
                    <Ionicons 
                        name={isCompleted ? 'checkmark-circle' : event.icon} 
                        size={28} 
                        color={isCompleted ? '#059669' : '#374151'} 
                    />
                </View>
                <View style={styles.eventTitleContainer}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    {isCompleted && submittedAt && (
                        <Text style={styles.completedTime}>
                            ✓ Submitted at {formatTime(submittedAt)}
                        </Text>
                    )}
                </View>
                {isCompleted && imageUrl ? (
                    <TouchableOpacity 
                        onPress={() => onViewImage?.(imageUrl)}
                        style={styles.viewImageButton}
                    >
                        <Ionicons name="image-outline" size={24} color="#3b82f6" />
                    </TouchableOpacity>
                ) : (
                    <View style={[
                        styles.statusBadge,
                        isCompleted ? styles.statusBadgeCompleted : styles.statusBadgePending
                    ]}>
                        <Text style={[
                            styles.statusText,
                            isCompleted ? styles.statusTextCompleted : styles.statusTextPending
                        ]}>
                            {isCompleted ? 'Done' : 'Pending'}
                        </Text>
                    </View>
                )}
            </View>
            <View style={[
                styles.descriptionBox,
                isCompleted && styles.descriptionBoxCompleted
            ]}>
                <Text style={styles.eventDescription}>
                    {event.description}, between {event.time_window}{shiftLabel ? ` - ${shiftLabel}` : ''}
                </Text>
            </View>
        </View>
    );
}

interface ShiftSectionProps {
    title: string;
    events: TrackerEventConfig[];
    eventDetails: Record<string, EventDetail>;
    onViewImage: (imageUrl: string) => void;
}

function ShiftSection({ title, events, eventDetails, onViewImage }: ShiftSectionProps) {
    if (events.length === 0) return null;
    
    const completedCount = events.filter(e => eventDetails[e.id]?.completed).length;
    
    return (
        <View style={styles.shiftSection}>
            <View style={styles.shiftBadgeContainer}>
                <View style={styles.shiftBadge}>
                    <Text style={styles.shiftBadgeText}>{title}</Text>
                </View>
                <Text style={styles.shiftProgress}>
                    {completedCount}/{events.length} completed
                </Text>
            </View>
            {events.map((event) => (
                <EventCard 
                    key={event.id} 
                    event={event} 
                    eventDetail={eventDetails[event.id]}
                    onViewImage={onViewImage}
                />
            ))}
        </View>
    );
}

export default function QuestionPaperScreen() {
    const insets = useSafeAreaInsets();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Fetch event summary from API
    const { 
        data: summaryData, 
        isLoading, 
        isError, 
        error,
        refetch,
        isRefetching,
    } = useQuery({
        queryKey: ['exam-tracker-summary', today],
        queryFn: async () => {
            const result = await getEventSummary(today);
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch summary');
            }
            return result.data;
        },
        staleTime: 30000, // 30 seconds
    });

    // Group events by shift
    const generalEvents = TRACKER_EVENTS.filter(e => e.shift === 'GENERAL');
    const morningEvents = TRACKER_EVENTS.filter(e => e.shift === 'MORNING');
    const afternoonEvents = TRACKER_EVENTS.filter(e => e.shift === 'AFTERNOON');

    const eventDetails: Record<string, EventDetail> = summaryData?.eventDetails || {};
    const completedCount = summaryData?.completedEvents?.length || 0;
    const totalEvents = TRACKER_EVENTS.length;

    const handleViewImage = (imageUrl: string) => {
        // Construct full URL if it's a relative path
        const fullUrl = imageUrl.startsWith('http') 
            ? imageUrl 
            : `${API_CONFIG.BASE_URL}${imageUrl}`;
        setSelectedImage(fullUrl);
    };

    const onRefresh = useCallback(() => {
        refetch();
    }, [refetch]);

    // Loading state
    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading tracker status...</Text>
            </View>
        );
    }

    // Error state
    if (isError) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                <Text style={styles.errorText}>Failed to load tracker</Text>
                <Text style={styles.errorSubtext}>{(error as Error)?.message}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                    <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView 
                style={styles.content} 
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
                }
            >
                {/* Title Section */}
                <Text style={styles.pageTitle}>Question Paper Tracker</Text>
                <Text style={styles.pageSubtitle}>
                    Compartmental Exams • {summaryData?.school_name || 'Your Center'}
                </Text>

                {/* Overall Progress Card */}
                <View style={styles.progressCard}>
                    <View style={styles.progressHeader}>
                        <Ionicons name="checkmark-done-circle" size={32} color="#3b82f6" />
                        <View style={styles.progressInfo}>
                            <Text style={styles.progressTitle}>Today's Progress</Text>
                            <Text style={styles.progressDate}>
                                {new Date().toLocaleDateString('en-IN', { 
                                    weekday: 'long', 
                                    day: 'numeric', 
                                    month: 'long', 
                                    year: 'numeric' 
                                })}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.progressBar}>
                        <View 
                            style={[
                                styles.progressFill, 
                                { width: `${(completedCount / totalEvents) * 100}%` }
                            ]} 
                        />
                    </View>
                    <Text style={styles.progressText}>
                        {completedCount} of {totalEvents} steps completed
                    </Text>
                </View>

                {/* General Events (No shift) */}
                {generalEvents.map((event) => (
                    <EventCard 
                        key={event.id} 
                        event={event} 
                        eventDetail={eventDetails[event.id]}
                        onViewImage={handleViewImage}
                    />
                ))}

                {/* Morning Shift Events */}
                <ShiftSection 
                    title="MORNING SHIFT" 
                    events={morningEvents}
                    eventDetails={eventDetails}
                    onViewImage={handleViewImage}
                />

                {/* Afternoon Shift Events */}
                <ShiftSection 
                    title="AFTERNOON SHIFT" 
                    events={afternoonEvents}
                    eventDetails={eventDetails}
                    onViewImage={handleViewImage}
                />

                {/* Bottom spacing */}
                <View style={{ height: 32 }} />
            </ScrollView>

            {/* Image Preview Modal */}
            <Modal
                visible={!!selectedImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalCloseArea}
                        onPress={() => setSelectedImage(null)}
                        activeOpacity={1}
                    />
                    <View style={styles.imageContainer}>
                        <TouchableOpacity 
                            style={styles.closeButton}
                            onPress={() => setSelectedImage(null)}
                        >
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                        {selectedImage && (
                            <Image
                                source={{ uri: selectedImage }}
                                style={styles.previewImage}
                                resizeMode="contain"
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#f9fafb',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
    },
    errorText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
    },
    errorSubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#3b82f6',
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingTop: 20,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 4,
    },
    pageSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 20,
    },
    progressCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    progressInfo: {
        marginLeft: 12,
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    progressDate: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 2,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#059669',
        borderRadius: 4,
    },
    progressText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
    },
    shiftSection: {
        marginTop: 8,
    },
    shiftBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginTop: 16,
        marginBottom: 16,
    },
    shiftBadge: {
        backgroundColor: '#374151',
        paddingHorizontal: 24,
        paddingVertical: 8,
        borderRadius: 20,
    },
    shiftBadgeText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 1,
    },
    shiftProgress: {
        fontSize: 13,
        color: '#6b7280',
    },
    eventCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
    },
    eventCardCompleted: {
        borderColor: '#a7f3d0',
        backgroundColor: '#f0fdf4',
    },
    eventHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    iconContainerCompleted: {
        backgroundColor: '#d1fae5',
    },
    eventTitleContainer: {
        flex: 1,
        marginRight: 8,
    },
    eventTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
        lineHeight: 22,
    },
    completedTime: {
        fontSize: 12,
        color: '#059669',
        marginTop: 4,
        fontWeight: '500',
    },
    viewImageButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusBadgeCompleted: {
        backgroundColor: '#d1fae5',
    },
    statusBadgePending: {
        backgroundColor: '#fef3c7',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusTextCompleted: {
        color: '#059669',
    },
    statusTextPending: {
        color: '#d97706',
    },
    descriptionBox: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderStyle: 'dashed',
        borderRadius: 12,
        backgroundColor: '#fafafa',
    },
    descriptionBoxCompleted: {
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0',
    },
    eventDescription: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 20,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    imageContainer: {
        width: screenWidth - 32,
        height: screenWidth - 32,
        borderRadius: 16,
        overflow: 'hidden',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
    },
});
