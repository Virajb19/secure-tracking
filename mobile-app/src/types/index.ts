/**
 * Type Definitions
 * 
 * These types MUST match the backend API contracts exactly.
 * Any deviation could cause security issues.
 */

/**
 * User roles as defined in backend.
 */
export type UserRole = 'ADMIN' | 'DELIVERY';

/**
 * User object returned from login.
 */
export interface User {
    id: string;
    name: string;
    phone: string;
    role: UserRole;
}

/**
 * Login request payload.
 * Sent to POST /auth/login
 */
export interface LoginRequest {
    phone: string;
    device_id: string;
}

/**
 * Login response from backend.
 * Backend returns snake_case.
 */
export interface LoginResponse {
    access_token: string;
    user: User;
}

/**
 * Task status as defined in backend.
 * PENDING: Task created but not started
 * IN_PROGRESS: Delivery has begun (PICKUP event received)
 * COMPLETED: Delivery finished successfully (FINAL event received)
 * SUSPICIOUS: Delivery flagged due to time window violation
 */
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SUSPICIOUS';

/**
 * Task event type.
 * Follows strict progression: PICKUP → TRANSIT → FINAL
 */
export type EventType = 'PICKUP' | 'TRANSIT' | 'FINAL';

/**
 * Task object from backend.
 * Matches backend Task entity structure.
 */
export interface Task {
    id: string;
    sealed_pack_code: string;
    source_location: string;
    destination_location: string;
    assigned_user_id: string;
    start_time: string;
    end_time: string;
    status: TaskStatus;
    created_at: string;
}

/**
 * Task event object from backend.
 * Represents an immutable evidence record.
 */
export interface TaskEvent {
    id: string;
    task_id: string;
    event_type: EventType;
    image_url: string;
    image_hash: string;
    latitude: number;
    longitude: number;
    server_timestamp: string;
    created_at: string;
}

/**
 * Create event request payload.
 * Sent as multipart/form-data.
 */
export interface CreateEventRequest {
    event_type: EventType;
    latitude: number;
    longitude: number;
}

/**
 * API Error response structure.
 */
export interface ApiError {
    statusCode: number;
    message: string | string[];
    error?: string;
}

/**
 * Auth context state.
 */
export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}
