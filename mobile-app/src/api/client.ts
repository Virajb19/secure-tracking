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
import { getAccessToken, getRefreshToken, storeAccessToken, storeRefreshToken, clearAuthData } from '../utils/storage';
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

// ============================================
// Token Refresh Logic
// ============================================
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (token) resolve(token);
        else reject(error);
    });
    failedQueue = [];
};

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
 * Handles 401 errors by attempting token refresh before clearing auth data.
 */
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Debug logging
        if (__DEV__) {
            console.log(`[API] Error: ${error.response?.status || 'Network Error'}`);
            console.log(`[API] Error message:`, error.message);
        }

        const url = originalRequest?.url || '';
        const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/refresh');

        // Handle 401 - attempt token refresh
        if (error.response?.status === 401 && !isAuthRoute && !originalRequest._retry) {
            const refreshToken = await getRefreshToken();

            if (!refreshToken) {
                await clearAuthData();
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise<string>((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((newToken) => {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return apiClient(originalRequest);
                }).catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const { data } = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh`, {
                    refresh_token: refreshToken,
                });

                await storeAccessToken(data.access_token);
                await storeRefreshToken(data.refresh_token);

                originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
                processQueue(null, data.access_token);
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                await clearAuthData();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
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

/**
 * Helper to extract error code from API error response.
 */
export function getErrorCode(error: unknown): string | undefined {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiError>;

        if (!axiosError.response) {
            return 'NETWORK_ERROR';
        }

        const data = axiosError.response.data;

        // Check for error code in response
        if (data?.errorCode) {
            return data.errorCode;
        }

        // Map HTTP status to error codes
        if (axiosError.response.status === 409) {
            return 'CONFLICT';
        }
        if (axiosError.response.status === 401) {
            return 'UNAUTHORIZED';
        }
        if (axiosError.response.status === 403) {
            return 'FORBIDDEN';
        }
        if (axiosError.response.status === 404) {
            return 'NOT_FOUND';
        }
    }

    return undefined;
}

export default apiClient;
