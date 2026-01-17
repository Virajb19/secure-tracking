/**
 * Task Service
 * 
 * Handles API calls for task-related operations.
 * 
 * ENDPOINTS:
 * - GET /api/tasks/my - Get assigned tasks for DELIVERY user
 * - GET /api/tasks/:taskId - Get specific task details
 */

import apiClient, { getErrorMessage } from '../api/client';
import { Task, TaskEvent } from '../types';

/**
 * Result type for fetching tasks list.
 */
export interface FetchTasksResult {
    success: boolean;
    tasks?: Task[];
    error?: string;
}

/**
 * Result type for fetching single task.
 */
export interface FetchTaskResult {
    success: boolean;
    task?: Task;
    error?: string;
}

/**
 * Fetch all tasks assigned to the current DELIVERY user.
 * 
 * @returns List of assigned tasks or error
 */
export async function fetchMyTasks(): Promise<FetchTasksResult> {
    try {
        console.log('[Tasks] Fetching my tasks...');

        const response = await apiClient.get<Task[]>('/tasks/my');

        console.log(`[Tasks] Fetched ${response.data.length} tasks`);

        return {
            success: true,
            tasks: response.data,
        };

    } catch (error) {
        console.log('[Tasks] Failed to fetch tasks:', error);

        return {
            success: false,
            error: getErrorMessage(error),
        };
    }
}

/**
 * Fetch a specific task by ID.
 * Only returns the task if assigned to the current user.
 * 
 * @param taskId - The task ID to fetch
 * @returns Task details or error
 */
export async function fetchTaskById(taskId: string): Promise<FetchTaskResult> {
    try {
        console.log(`[Tasks] Fetching task ${taskId}...`);

        const response = await apiClient.get<Task>(`/tasks/${taskId}`);

        console.log('[Tasks] Task fetched successfully');

        return {
            success: true,
            task: response.data,
        };

    } catch (error) {
        console.log('[Tasks] Failed to fetch task:', error);

        return {
            success: false,
            error: getErrorMessage(error),
        };
    }
}

/**
 * Result type for fetching task events.
 */
export interface FetchEventsResult {
    success: boolean;
    events?: TaskEvent[];
    error?: string;
}

/**
 * Fetch all events for a specific task.
 * Returns events in chronological order.
 * 
 * @param taskId - The task ID to fetch events for
 * @returns List of events or error
 */
export async function fetchTaskEvents(taskId: string): Promise<FetchEventsResult> {
    try {
        console.log(`[Tasks] Fetching events for task ${taskId}...`);

        const response = await apiClient.get<TaskEvent[]>(`/tasks/${taskId}/events`);

        console.log(`[Tasks] Fetched ${response.data.length} events`);

        return {
            success: true,
            events: response.data,
        };

    } catch (error) {
        console.log('[Tasks] Failed to fetch events:', error);

        return {
            success: false,
            error: getErrorMessage(error),
        };
    }
}
