/**
 * Exam Scheduler Service
 * 
 * Handles API calls for exam schedule and time window management.
 * Used to determine allowed time windows for QPT tracker events.
 * 
 * ENDPOINTS:
 * - GET /api/exam-scheduler - Get exam schedules
 * - GET /api/exam-scheduler/time-windows - Get time windows for a date
 * - GET /api/exam-scheduler/validate-time - Validate time for event submission
 */

import apiClient, { getErrorMessage } from '../api/client';

/**
 * Subject category determines exam duration and time windows
 */
export type SubjectCategory = 'CORE' | 'VOCATIONAL';

/**
 * Time window for a tracker event
 */
export interface TimeWindow {
    start_hour: number;
    start_minute: number;
    end_hour: number;
    end_minute: number;
    label: string;
}

/**
 * All time windows for tracker events
 */
export interface TrackerTimeWindows {
    TREASURY_ARRIVAL: TimeWindow;
    CUSTODIAN_HANDOVER: TimeWindow;
    OPENING: TimeWindow;
    PACKING: TimeWindow;
    DELIVERY: TimeWindow;
}

/**
 * Exam schedule entry
 */
export interface ExamScheduleEntry {
    id: string;
    exam_date: string;
    class: 'CLASS_10' | 'CLASS_12';
    subject: string;
    subject_category: SubjectCategory;
    exam_start_time: string;
    exam_end_time: string;
    is_active: boolean;
}

/**
 * Time windows response from API
 */
export interface TimeWindowsResponse {
    exam_date: string;
    subject_category: SubjectCategory;
    schedules: ExamScheduleEntry[];
    time_windows: TrackerTimeWindows;
}

/**
 * Get time windows for QPT tracker events on a specific date.
 */
export async function getTimeWindows(
    examDate?: string,
): Promise<{ success: boolean; data?: TimeWindowsResponse; error?: string }> {
    try {
        const params = examDate ? { date: examDate } : {};
        const response = await apiClient.get('/exam-scheduler/time-windows', { params });

        if (response.data.success) {
            return {
                success: true,
                data: response.data.data,
            };
        }

        return { success: false, error: 'Failed to fetch time windows' };
    } catch (error) {
        console.error('[ExamScheduler] Error fetching time windows:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

/**
 * Validate if current time allows an event submission.
 */
export async function validateEventTime(
    examDate: string,
    eventType: string,
): Promise<{ success: boolean; data?: { allowed: boolean; message: string; subject_category: SubjectCategory }; error?: string }> {
    try {
        const response = await apiClient.get('/exam-scheduler/validate-time', {
            params: { date: examDate, eventType },
        });

        if (response.data.success) {
            return {
                success: true,
                data: response.data.data,
            };
        }

        return { success: false, error: 'Failed to validate time' };
    } catch (error) {
        console.error('[ExamScheduler] Error validating time:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

/**
 * Get exam schedules with optional filters.
 */
export async function getExamSchedules(
    filters?: { date?: string; class?: string; category?: string },
): Promise<{ success: boolean; data?: ExamScheduleEntry[]; error?: string }> {
    try {
        const response = await apiClient.get('/exam-scheduler', { params: filters });

        if (response.data.success) {
            return {
                success: true,
                data: response.data.data,
            };
        }

        return { success: false, error: 'Failed to fetch schedules' };
    } catch (error) {
        console.error('[ExamScheduler] Error fetching schedules:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

/**
 * Check if current time is within a given time window (client-side check).
 * This is used for UI state (enabling/disabling buttons) before server validation.
 */
export function isWithinTimeWindowLocal(window: TimeWindow): boolean {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const windowStart = window.start_hour * 60 + window.start_minute;
    const windowEnd = window.end_hour * 60 + window.end_minute;
    return currentMinutes >= windowStart && currentMinutes <= windowEnd;
}

/**
 * Map event type to time window key.
 */
export function getTimeWindowForEvent(
    eventType: string,
    timeWindows: TrackerTimeWindows,
): TimeWindow {
    switch (eventType) {
        case 'TREASURY_ARRIVAL':
            return timeWindows.TREASURY_ARRIVAL;
        case 'CUSTODIAN_HANDOVER':
            return timeWindows.CUSTODIAN_HANDOVER;
        case 'OPENING_MORNING':
        case 'OPENING_AFTERNOON':
            return timeWindows.OPENING;
        case 'PACKING_MORNING':
        case 'PACKING_AFTERNOON':
            return timeWindows.PACKING;
        case 'DELIVERY_MORNING':
        case 'DELIVERY_AFTERNOON':
            return timeWindows.DELIVERY;
        default:
            return timeWindows.TREASURY_ARRIVAL;
    }
}
