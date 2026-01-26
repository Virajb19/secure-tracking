/**
 * Event Service
 * 
 * PHASE 3 SECURITY COMPONENT
 * 
 * Handles event submission with image upload.
 * 
 * SECURITY NOTES:
 * - Uses multipart/form-data for image upload
 * - No image caching or reuse
 * - Server generates timestamp and hash
 * 
 * API: POST /api/tasks/:taskId/events
 */

import { API_CONFIG } from '../constants/config';
import { getAccessToken } from '../utils/storage';
import { hasInternetConnection, checkNetworkStatus, getNetworkErrorMessage } from '../utils/network';
import { EventType, TaskEvent } from '../types';

/**
 * Event submission result.
 */
export interface SubmitEventResult {
    success: boolean;
    event?: TaskEvent;
    error?: string;
    errorCode?: 'DUPLICATE_EVENT' | 'TASK_COMPLETED' | 'TIME_VIOLATION' | 'UNAUTHORIZED' | 'NETWORK' | 'NO_INTERNET' | 'UNKNOWN';
}

/**
 * Submit a task event with image proof.
 * 
 * CRITICAL: This uses fetch directly (not axios) for proper
 * multipart/form-data handling with file upload.
 * 
 * PHASE 4 HARDENING:
 * - Network check before upload
 * - Enhanced logging
 * - Graceful failure handling
 * 
 * @param taskId - The task ID
 * @param eventType - PICKUP, TRANSIT, or FINAL
 * @param imageUri - Local URI of the captured image
 * @param latitude - GPS latitude
 * @param longitude - GPS longitude
 * @returns Submission result
 */
export async function submitEvent(
    taskId: string,
    eventType: EventType,
    imageUri: string,
    latitude: number,
    longitude: number,
): Promise<SubmitEventResult> {
    const startTime = Date.now();
    console.log(`[Event] ========== SUBMISSION START ==========`);
    console.log(`[Event] Task: ${taskId}`);
    console.log(`[Event] Event Type: ${eventType}`);
    console.log(`[Event] Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);

    try {
        // PHASE 4: Check network before attempting upload
        console.log('[Event] Checking network connectivity...');
        const hasInternet = await hasInternetConnection();

        if (!hasInternet) {
            const status = await checkNetworkStatus();
            console.log('[Event] No internet connection detected');
            return {
                success: false,
                error: getNetworkErrorMessage(status),
                errorCode: 'NO_INTERNET',
            };
        }
        console.log('[Event] Network check passed');

        // Get auth token
        const token = await getAccessToken();
        if (!token) {
            return {
                success: false,
                error: 'Authentication required. Please login again.',
                errorCode: 'UNAUTHORIZED',
            };
        }

        // Build multipart form data
        const formData = new FormData();

        // Add image file
        // React Native requires special handling for file uploads
        const imageFile = {
            uri: imageUri,
            type: 'image/jpeg',
            name: `event_${eventType}_${Date.now()}.jpg`,
        } as any;

        formData.append('image', imageFile);
        formData.append('event_type', eventType);
        formData.append('latitude', latitude.toString());
        formData.append('longitude', longitude.toString());

        console.log('[Event] Uploading to:', `${API_CONFIG.BASE_URL}/tasks/${taskId}/events`);

        // Make the request
        const response = await fetch(`${API_CONFIG.BASE_URL}/tasks/${taskId}/events`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                // Note: Do NOT set Content-Type header for FormData
                // fetch will set it automatically with boundary
            },
            body: formData,
        });

        // Parse response
        const data = await response.json();

        // Handle success
        if (response.ok) {
            const elapsed = Date.now() - startTime;
            console.log(`[Event] ========== SUBMISSION SUCCESS ==========`);
            console.log(`[Event] Elapsed: ${elapsed}ms`);
            return {
                success: true,
                event: data,
            };
        }

        // Handle specific error cases
        console.log('[Event] Submission failed:', response.status, data);

        const errorMessage = Array.isArray(data.message)
            ? data.message[0]
            : data.message || 'Failed to submit event';

        // Map error messages to codes
        let errorCode: SubmitEventResult['errorCode'] = 'UNKNOWN';

        if (errorMessage.toLowerCase().includes('already') ||
            errorMessage.toLowerCase().includes('duplicate')) {
            errorCode = 'DUPLICATE_EVENT';
        } else if (errorMessage.toLowerCase().includes('completed') ||
            errorMessage.toLowerCase().includes('locked')) {
            errorCode = 'TASK_COMPLETED';
        } else if (errorMessage.toLowerCase().includes('time') ||
            errorMessage.toLowerCase().includes('window') ||
            errorMessage.toLowerCase().includes('suspicious')) {
            errorCode = 'TIME_VIOLATION';
        } else if (response.status === 401 || response.status === 403) {
            errorCode = 'UNAUTHORIZED';
        }

        return {
            success: false,
            error: errorMessage,
            errorCode,
        };

    } catch (error) {
        console.error('[Event] Network error:', error);

        return {
            success: false,
            error: 'Network error. Please check your connection.',
            errorCode: 'NETWORK',
        };
    }
}

/**
 * Get the next required event type based on task status and events.
 * 
 * Enforces strict sequence: 
 * Full day: PICKUP_POLICE_STATION → ARRIVAL_EXAM_CENTER → OPENING_SEAL → SEALING_ANSWER_SHEETS → SUBMISSION_POST_OFFICE
 * Double shift (Afternoon): OPENING_SEAL → SEALING_ANSWER_SHEETS → SUBMISSION_POST_OFFICE
 * 
 * @param completedEvents - Array of already completed event types
 * @param isDoubleShiftAfternoon - Whether this is an afternoon session of a double shift
 * @returns The next event type or null if all complete
 */
export function getNextEventType(completedEvents: EventType[], isDoubleShiftAfternoon: boolean = false): EventType | null {
    if (isDoubleShiftAfternoon) {
        // Afternoon shift skips first 2 steps (pickup and arrival - already done in morning)
        if (!completedEvents.includes('OPENING_SEAL')) {
            return 'OPENING_SEAL';
        }
        if (!completedEvents.includes('SEALING_ANSWER_SHEETS')) {
            return 'SEALING_ANSWER_SHEETS';
        }
        if (!completedEvents.includes('SUBMISSION_POST_OFFICE')) {
            return 'SUBMISSION_POST_OFFICE';
        }
    } else {
        // Full 5-step sequence for morning or single shift
        if (!completedEvents.includes('PICKUP_POLICE_STATION')) {
            return 'PICKUP_POLICE_STATION';
        }
        if (!completedEvents.includes('ARRIVAL_EXAM_CENTER')) {
            return 'ARRIVAL_EXAM_CENTER';
        }
        if (!completedEvents.includes('OPENING_SEAL')) {
            return 'OPENING_SEAL';
        }
        if (!completedEvents.includes('SEALING_ANSWER_SHEETS')) {
            return 'SEALING_ANSWER_SHEETS';
        }
        if (!completedEvents.includes('SUBMISSION_POST_OFFICE')) {
            return 'SUBMISSION_POST_OFFICE';
        }
    }
    return null; // All events completed
}

/**
 * Check if an event type is allowed based on completed events.
 * 
 * Prevents skipping or reordering events.
 */
export function isEventAllowed(eventType: EventType, completedEvents: EventType[], isDoubleShiftAfternoon: boolean = false): boolean {
    const nextEvent = getNextEventType(completedEvents, isDoubleShiftAfternoon);
    return nextEvent === eventType;
}

/**
 * Get event step information for UI display.
 * 5-Step Tracking Steps for Exam Paper Delivery
 */
export const EVENT_STEPS: Array<{
    type: EventType;
    label: string;
    icon: string;
    description: string;
    skipForAfternoon?: boolean;
}> = [
        {
            type: 'PICKUP_POLICE_STATION',
            label: 'Police Station Pickup',
            icon: '🚔',
            description: 'Collect sealed pack from Police Station',
            skipForAfternoon: true,
        },
        {
            type: 'ARRIVAL_EXAM_CENTER',
            label: 'Exam Center Arrival',
            icon: '🏫',
            description: 'Arrive at the examination center',
            skipForAfternoon: true,
        },
        {
            type: 'OPENING_SEAL',
            label: 'Opening Seal',
            icon: '📦',
            description: 'Open the sealed question paper pack',
        },
        {
            type: 'SEALING_ANSWER_SHEETS',
            label: 'Seal Answer Sheets',
            icon: '✍️',
            description: 'Seal collected answer sheets',
        },
        {
            type: 'SUBMISSION_POST_OFFICE',
            label: 'Post Office Submission',
            icon: '📮',
            description: 'Submit sealed pack at Post Office',
        },
    ];
