/**
 * Question Paper Tracking Tab - Headmaster
 * 
 * Only visible to users with is_center_superintendent flag.
 * Shows question paper tracking events for exam centers.
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
import { useAuth } from '../../../../src/contexts/AuthContext';
import { 
    getEventSummary, 
    ExamTrackerEventType,
    EventDetail,
} from '../../../../src/services/exam-tracker.service';
import { API_CONFIG } from '../../../../src/constants/config';

// Event configuration with display information
interface TrackerEventConfig {
    id: ExamTrackerEventType;
    title: string;
    description: string;
    shift: 'MORNING' | 'AFTERNOON' | 'GENERAL';
    icon: keyof typeof Ionicons.glyphMap;
    time_window: string;
}

// Predefined tracker events
const TRACKER_EVENTS: TrackerEventConfig[] = [
    {
        id: ExamTrackerEventType.TREASURY_ARRIVAL,
        title: 'Center Superintendent at the Treasury Office / Bank',
        description: 'Click a picture when reached at the Treasury Office or Bank',
        shift: 'GENERAL',
        icon: 'business-outline',
        time_window: '7:30 AM to 8:40 AM',
    },
    {
        id: ExamTrackerEventType.CUSTODIAN_HANDOVER,
        title: 'Custodian to Center Superintendent',
        description: 'Click a picture when receiving the question papers',
        shift: 'GENERAL',
        icon: 'people-outline',
        time_window: '7:30 AM to 8:40 AM',
    },
    {
        id: ExamTrackerEventType.OPENING_MORNING,
        title: 'Opening of Question Paper (Morning)',
        description: 'Click a picture on opening the question papers',
        shift: 'MORNING',
        icon: 'mail-open-outline',
        time_window: '8:30 AM to 9:00 AM',
    },
    {
        id: ExamTrackerEventType.PACKING_MORNING,
        title: 'Packing & Sealing of Answerbooks (Morning)',
        description: 'Click a picture after packing & sealing',
        shift: 'MORNING',
        icon: 'cube-outline',
        time_window: '12:00 Noon to 2:00 PM',
    },
    {
        id: ExamTrackerEventType.DELIVERY_MORNING,
        title: 'Delivery at Post Office (Morning)',
        description: 'Click a picture when delivering Answerbooks',
        shift: 'MORNING',
        icon: 'send-outline',
        time_window: '1:00 PM to 3:00 PM',
    },
    {
        id: ExamTrackerEventType.OPENING_AFTERNOON,
        title: 'Opening of Question Paper (Afternoon)',
        description: 'Click a picture on opening the question papers',
        shift: 'AFTERNOON',
        icon: 'mail-open-outline',
        time_window: '1:00 PM to 1:30 PM',
    },
    {
        id: ExamTrackerEventType.PACKING_AFTERNOON,
        title: 'Packing & Sealing of Answerbooks (Afternoon)',
        description: 'Click a picture after packing & sealing',
        shift: 'AFTERNOON',
        icon: 'cube-outline',
        time_window: '4:00 PM to 5:00 PM',
    },
    {
        id: ExamTrackerEventType.DELIVERY_AFTERNOON,
        title: 'Delivery at Post Office (Afternoon)',
        description: 'Click a picture when delivering Answerbooks',
        shift: 'AFTERNOON',
        icon: 'send-outline',
        time_window: '4:30 PM to 6:00 PM',
    },
];

export default function QPTTabScreen() {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Fetch event summary
    const { data: eventSummary, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['exam-tracker-summary'],
        queryFn: () => getEventSummary(),
        enabled: user?.is_center_superintendent ?? false,
    });

    // Check if user has CS access
    if (!user?.is_center_superintendent) {
        return (
            <View style={styles.noAccessContainer}>
                <Ionicons name="lock-closed-outline" size={64} color="#9ca3af" />
                <Text style={styles.noAccessTitle}>Access Restricted</Text>
                <Text style={styles.noAccessText}>
                    You need to be assigned as a Center Superintendent to access Question Paper Tracking.
                </Text>
            </View>
        );
    }

    // Get completed events from API response
    const eventDetails: Partial<Record<ExamTrackerEventType, EventDetail>> = eventSummary?.data?.eventDetails || {};
    const completedEventTypes = eventSummary?.data?.completedEvents || [];

    // Group events by shift
    const generalEvents = TRACKER_EVENTS.filter(e => e.shift === 'GENERAL');
    const morningEvents = TRACKER_EVENTS.filter(e => e.shift === 'MORNING');
    const afternoonEvents = TRACKER_EVENTS.filter(e => e.shift === 'AFTERNOON');

    const getEventStatus = (eventId: ExamTrackerEventType): EventDetail | undefined => {
        return eventDetails[eventId];
    };

    const renderEventCard = (event: TrackerEventConfig) => {
        const completed = getEventStatus(event.id);
        const isCompleted = !!completed;

        return (
            <TouchableOpacity 
                key={event.id}
                style={[styles.eventCard, isCompleted && styles.eventCardCompleted]}
                onPress={() => completed?.image_url && setSelectedImage(`${API_CONFIG.BASE_URL}${completed.image_url}`)}
                disabled={!isCompleted}
            >
                <View style={[styles.eventIcon, isCompleted && styles.eventIconCompleted]}>
                    <Ionicons 
                        name={isCompleted ? 'checkmark-circle' : event.icon} 
                        size={24} 
                        color={isCompleted ? '#10b981' : '#6b7280'} 
                    />
                </View>
                <View style={styles.eventContent}>
                    <Text style={[styles.eventTitle, isCompleted && styles.eventTitleCompleted]}>
                        {event.title}
                    </Text>
                    <Text style={styles.eventTime}>{event.time_window}</Text>
                    {isCompleted && completed.submitted_at && (
                        <Text style={styles.completedTime}>
                            Completed: {new Date(completed.submitted_at).toLocaleTimeString()}
                        </Text>
                    )}
                </View>
                {isCompleted && (
                    <Ionicons name="image-outline" size={20} color="#10b981" />
                )}
            </TouchableOpacity>
        );
    };

    const renderShiftSection = (title: string, events: TrackerEventConfig[]) => (
        <View style={styles.shiftSection}>
            <Text style={styles.shiftTitle}>{title}</Text>
            {events.map(renderEventCard)}
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#374151" />
                <Text style={styles.loadingText}>Loading tracking data...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                }
            >
                {/* School Info */}
                {eventSummary?.data?.school_name && (
                    <View style={styles.schoolInfo}>
                        <Ionicons name="school-outline" size={20} color="#374151" />
                        <Text style={styles.schoolName}>{eventSummary.data.school_name}</Text>
                    </View>
                )}

                {/* Progress Summary */}
                <View style={styles.progressCard}>
                    <Text style={styles.progressTitle}>Today's Progress</Text>
                    <View style={styles.progressBar}>
                        <View 
                            style={[
                                styles.progressFill, 
                                { width: `${(completedEventTypes.length / TRACKER_EVENTS.length) * 100}%` }
                            ]} 
                        />
                    </View>
                    <Text style={styles.progressText}>
                        {completedEventTypes.length} of {TRACKER_EVENTS.length} events completed
                    </Text>
                </View>

                {/* General Events */}
                {renderShiftSection('General', generalEvents)}

                {/* Morning Shift */}
                {renderShiftSection('Morning Shift', morningEvents)}

                {/* Afternoon Shift */}
                {renderShiftSection('Afternoon Shift', afternoonEvents)}
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
                            style={styles.closeButton}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    scrollContent: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6b7280',
    },
    noAccessContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        backgroundColor: '#f3f4f6',
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
    schoolInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        gap: 8,
    },
    schoolName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        flex: 1,
    },
    progressCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    progressTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#10b981',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 8,
    },
    shiftSection: {
        marginBottom: 20,
    },
    shiftTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    eventCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    eventCardCompleted: {
        borderColor: '#10b981',
        backgroundColor: '#f0fdf4',
    },
    eventIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    eventIconCompleted: {
        backgroundColor: '#dcfce7',
    },
    eventContent: {
        flex: 1,
    },
    eventTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 4,
    },
    eventTitleCompleted: {
        color: '#059669',
    },
    eventTime: {
        fontSize: 12,
        color: '#9ca3af',
    },
    completedTime: {
        fontSize: 11,
        color: '#10b981',
        marginTop: 2,
    },
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
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height * 0.7,
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
    },
});
