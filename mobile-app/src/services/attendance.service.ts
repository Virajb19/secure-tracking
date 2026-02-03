/**
 * Attendance Service
 * 
 * Handles API calls for geo-fenced attendance operations.
 * 
 * ENDPOINTS:
 * - POST /api/tasks/:taskId/attendance - Mark attendance with photo
 * - GET /api/tasks/:taskId/attendance - Get attendance records
 */

import apiClient, { getErrorMessage, getErrorCode } from '../api/client';
import * as FileSystem from 'expo-file-system';

/**
 * Attendance record type
 */
export interface AttendanceRecord {
    id: string;
    location_type: 'PICKUP' | 'DESTINATION';
    image_url: string;
    latitude: number;
    longitude: number;
    is_within_geofence: boolean;
    distance_from_target: string | null;
    timestamp: string;
}

/**
 * Result type for marking attendance
 */
export interface MarkAttendanceResult {
    success: boolean;
    attendance?: AttendanceRecord;
    message?: string;
    error?: string;
    errorCode?: string;
}

/**
 * Result type for fetching attendance
 */
export interface FetchAttendanceResult {
    success: boolean;
    attendance?: AttendanceRecord[];
    error?: string;
}

/**
 * Mark attendance at a location with photo.
 * 
 * @param taskId - The task ID
 * @param locationType - PICKUP or DESTINATION
 * @param imageUri - Local file URI of the photo
 * @param latitude - Current GPS latitude
 * @param longitude - Current GPS longitude
 * @returns Attendance result or error
 */
export async function markAttendance(
    taskId: string,
    locationType: 'PICKUP' | 'DESTINATION',
    imageUri: string,
    latitude: number,
    longitude: number,
): Promise<MarkAttendanceResult> {
    try {
        console.log(`[Attendance] Marking ${locationType} attendance for task ${taskId}...`);
        console.log(`[Attendance] Location: ${latitude}, ${longitude}`);

        // Create form data
        const formData = new FormData();
        formData.append('location_type', locationType);
        formData.append('latitude', String(latitude));
        formData.append('longitude', String(longitude));

        // Get file info
        const fileInfo = await FileSystem.getInfoAsync(imageUri);
        if (!fileInfo.exists) {
            throw new Error('Image file not found');
        }

        // Append image file
        const filename = imageUri.split('/').pop() || 'attendance.jpg';
        formData.append('image', {
            uri: imageUri,
            name: filename,
            type: 'image/jpeg',
        } as any);

        // Send to backend
        const response = await apiClient.post(
            `/tasks/${taskId}/attendance`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 30000,
            }
        );

        console.log('[Attendance] Success:', response.data.message);

        return {
            success: true,
            attendance: response.data.attendance,
            message: response.data.message,
        };

    } catch (error: any) {
        console.log('[Attendance] Failed:', error);

        return {
            success: false,
            error: getErrorMessage(error),
            errorCode: getErrorCode(error),
        };
    }
}

/**
 * Fetch attendance records for a task.
 * 
 * @param taskId - The task ID
 * @returns List of attendance records or error
 */
export async function fetchTaskAttendance(taskId: string): Promise<FetchAttendanceResult> {
    try {
        console.log(`[Attendance] Fetching attendance for task ${taskId}...`);

        const response = await apiClient.get(`/tasks/${taskId}/attendance`);

        console.log(`[Attendance] Fetched ${response.data.attendance?.length || 0} records`);

        return {
            success: true,
            attendance: response.data.attendance,
        };

    } catch (error) {
        console.log('[Attendance] Failed to fetch:', error);

        return {
            success: false,
            error: getErrorMessage(error),
        };
    }
}
