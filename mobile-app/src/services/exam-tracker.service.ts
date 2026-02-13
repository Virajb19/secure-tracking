/**
 * Exam Tracker Service
 * 
 * Handles API calls for exam center question paper tracking.
 * Used by Center Superintendents (Headmasters) to submit and view events.
 * 
 * ENDPOINTS:
 * - GET /api/exam-tracker/events - Get events for user's school
 * - GET /api/exam-tracker/events/summary - Get event summary
 * - POST /api/exam-tracker/events - Submit a new event
 */

import apiClient, { getErrorMessage, getErrorCode } from '../api/client';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Exam tracker event types
 */
export enum ExamTrackerEventType {
    TREASURY_ARRIVAL = 'TREASURY_ARRIVAL',
    CUSTODIAN_HANDOVER = 'CUSTODIAN_HANDOVER',
    OPENING_MORNING = 'OPENING_MORNING',
    PACKING_MORNING = 'PACKING_MORNING',
    DELIVERY_MORNING = 'DELIVERY_MORNING',
    OPENING_AFTERNOON = 'OPENING_AFTERNOON',
    PACKING_AFTERNOON = 'PACKING_AFTERNOON',
    DELIVERY_AFTERNOON = 'DELIVERY_AFTERNOON',
}

/**
 * Exam tracker event record
 */
export interface ExamTrackerEvent {
    id: string;
    user_id: string;
    school_id: string;
    event_type: ExamTrackerEventType;
    exam_date: string;
    shift: 'MORNING' | 'AFTERNOON' | 'GENERAL' | null;
    image_url: string;
    image_hash: string;
    latitude: number;
    longitude: number;
    captured_at: string;
    submitted_at: string;
    is_verified: boolean;
    verified_by: string | null;
    verified_at: string | null;
    user?: {
        id: string;
        name: string;
        phone: string;
    };
    school?: {
        id: string;
        name: string;
        registration_code: string;
    };
}

/**
 * Event detail for summary response
 */
export interface EventDetail {
    completed: boolean;
    submitted_at?: string;
    image_url?: string;
}

/**
 * Event summary response
 */
export interface ExamTrackerSummary {
    school_id: string;
    school_name: string;
    examDate: string;
    completedEvents: ExamTrackerEventType[];
    pendingEvents: ExamTrackerEventType[];
    eventDetails: Record<ExamTrackerEventType, EventDetail>;
}

/**
 * Result type for fetching events
 */
export interface FetchEventsResult {
    success: boolean;
    data?: {
        events: ExamTrackerEvent[];
        school_id: string;
        school_name: string;
    };
    error?: string;
}

/**
 * Result type for fetching summary
 */
export interface FetchSummaryResult {
    success: boolean;
    data?: ExamTrackerSummary;
    error?: string;
}

/**
 * Result type for submitting event
 */
export interface SubmitEventResult {
    success: boolean;
    data?: ExamTrackerEvent;
    message?: string;
    error?: string;
    errorCode?: string;
}

/**
 * Get events for the current user's school.
 * 
 * @param examDate - Optional date to filter events (YYYY-MM-DD)
 * @returns Events list or error
 */
export async function getMySchoolEvents(
    examDate?: string,
): Promise<FetchEventsResult> {
    try {
        const params = examDate ? { date: examDate } : {};
        const response = await apiClient.get('/exam-tracker/events', { params });

        if (response.data.success) {
            return {
                success: true,
                data: response.data.data,
            };
        }

        return {
            success: false,
            error: 'Failed to fetch events',
        };
    } catch (error: any) {
        // Surface the server's descriptive 403 message (e.g. "QPT will be available on...")
        const status = error?.response?.status;
        const serverMessage = error?.response?.data?.message;
        if (status === 403 && serverMessage) {
            console.log('[ExamTracker] Access denied:', serverMessage);
            return { success: false, error: serverMessage };
        }
        console.error('[ExamTracker] Error fetching events:', error);
        return {
            success: false,
            error: getErrorMessage(error),
        };
    }
}

/**
 * Get event summary for the current user's school.
 * Shows which events are completed and which are pending.
 * 
 * @param examDate - Optional date to filter summary (YYYY-MM-DD)
 * @returns Event summary or error
 */
export async function getEventSummary(
    examDate?: string,
): Promise<FetchSummaryResult> {
    try {
        const params = examDate ? { date: examDate } : {};
        const response = await apiClient.get('/exam-tracker/events/summary', { params });

        if (response.data.success) {
            return {
                success: true,
                data: response.data.data,
            };
        }

        return {
            success: false,
            error: 'Failed to fetch summary',
        };
    } catch (error: any) {
        // Surface the server's descriptive 403 message
        const status = error?.response?.status;
        const serverMessage = error?.response?.data?.message;
        if (status === 403 && serverMessage) {
            console.log('[ExamTracker] Access denied:', serverMessage);
            return { success: false, error: serverMessage };
        }
        console.error('[ExamTracker] Error fetching summary:', error);
        return {
            success: false,
            error: getErrorMessage(error),
        };
    }
}

/**
 * Submit a new exam tracker event with photo.
 * 
 * @param eventType - Type of event being submitted
 * @param examDate - Date of the exam (YYYY-MM-DD)
 * @param imageUri - Local file URI of the photo
 * @param latitude - Current GPS latitude
 * @param longitude - Current GPS longitude
 * @param shift - Optional shift (MORNING, AFTERNOON, or GENERAL)
 * @returns Submission result or error
 */
export async function submitEvent(
    eventType: ExamTrackerEventType,
    examDate: string,
    imageUri: string,
    latitude: number,
    longitude: number,
    shift?: string,
): Promise<SubmitEventResult> {
    try {
        console.log(`[ExamTracker] Submitting ${eventType} for ${examDate}...`);
        console.log(`[ExamTracker] Location: ${latitude}, ${longitude}`);

        // Create form data
        const formData = new FormData();
        formData.append('event_type', eventType);
        formData.append('exam_date', examDate);
        formData.append('latitude', String(latitude));
        formData.append('longitude', String(longitude));
        formData.append('captured_at', new Date().toISOString());

        if (shift) {
            formData.append('shift', shift);
        }

        // Get file info
        const fileInfo = await FileSystem.getInfoAsync(imageUri);
        if (!fileInfo.exists) {
            throw new Error('Image file not found');
        }

        // Append image file
        const filename = imageUri.split('/').pop() || 'tracker.jpg';
        formData.append('image', {
            uri: imageUri,
            name: filename,
            type: 'image/jpeg',
        } as any);

        // Send to backend
        const response = await apiClient.post(
            '/exam-tracker/events',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 30000,
            }
        );

        if (response.data.success) {
            console.log('[ExamTracker] Event submitted successfully');
            return {
                success: true,
                data: response.data.data,
                message: response.data.message,
            };
        }

        return {
            success: false,
            error: 'Failed to submit event',
        };
    } catch (error) {
        console.error('[ExamTracker] Error submitting event:', error);
        return {
            success: false,
            error: getErrorMessage(error),
            errorCode: getErrorCode(error),
        };
    }
}

/**
 * Get a single event by ID.
 * 
 * @param eventId - The event ID
 * @returns Event details or error
 */
export async function getEventById(
    eventId: string,
): Promise<{ success: boolean; data?: ExamTrackerEvent; error?: string }> {
    try {
        const response = await apiClient.get(`/exam-tracker/events/${eventId}`);

        if (response.data.success) {
            return {
                success: true,
                data: response.data.data,
            };
        }

        return {
            success: false,
            error: 'Failed to fetch event',
        };
    } catch (error) {
        console.error('[ExamTracker] Error fetching event:', error);
        return {
            success: false,
            error: getErrorMessage(error),
        };
    }
}
