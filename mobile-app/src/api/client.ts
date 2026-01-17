/**
 * API Client
 * 
 * Axios instance configured for the Secure Delivery backend.
 * 
 * SECURITY FEATURES:
 * - Automatic JWT attachment on all requests
 * - 401 handling (triggers logout)
 * - Request/response logging (can be disabled in production)
 * - Timeout protection
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '../constants/config';
import { getAccessToken, clearAuthData } from '../utils/storage';
import { ApiError } from '../types';

/**
 * Axios instance for API calls.
 */
const apiClient = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Request interceptor.
 * Attaches JWT token to all outgoing requests.
 */
apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        // Get token from secure storage
        const token = await getAccessToken();

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Debug logging (disable in production)
        if (__DEV__) {
            console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * Response interceptor.
 * Handles 401 errors by clearing auth data.
 */
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error: AxiosError<ApiError>) => {
        // Debug logging
        if (__DEV__) {
            console.log(`[API] Error: ${error.response?.status}`, error.response?.data);
        }

        // Handle 401 - token expired or invalid
        if (error.response?.status === 401) {
            // Clear stored auth data
            // Note: We don't auto-redirect here, the AuthContext handles that
            await clearAuthData();
        }

        return Promise.reject(error);
    }
);

/**
 * Helper to extract error message from API error response.
 */
export function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiError>;

        // Check for network error
        if (!axiosError.response) {
            return 'Network error. Please check your connection.';
        }

        const data = axiosError.response.data;

        // Handle message array
        if (Array.isArray(data?.message)) {
            return data.message[0];
        }

        // Handle string message
        if (typeof data?.message === 'string') {
            return data.message;
        }

        // Fallback
        return `Error: ${axiosError.response.status}`;
    }

    // Unknown error
    return 'An unexpected error occurred.';
}

export default apiClient;
