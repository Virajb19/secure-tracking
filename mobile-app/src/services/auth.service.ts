/**
 * Authentication Service
 * 
 * Handles login API call.
 * 
 * SECURITY NOTES:
 * - Email + Password + device_id are REQUIRED for login
 * - Backend validates and binds device on first login
 * - Admin users are blocked (must use admin portal)
 * - Inactive users are blocked with appropriate message
 */

import apiClient, { getErrorMessage } from '../api/client';
import { LoginRequest, LoginResponse, User } from '../types';

/**
 * Custom error for role-based access denial.
 */
export class RoleNotAllowedError extends Error {
    constructor(role: string) {
        super(`Admin users cannot access the mobile app. Please use the admin portal.`);
        this.name = 'RoleNotAllowedError';
    }
}

/**
 * Custom error for inactive/unapproved users.
 */
export class UserNotApprovedError extends Error {
    constructor() {
        super('Your account is pending admin approval. Please wait for activation.');
        this.name = 'UserNotApprovedError';
    }
}

/**
 * Login result type.
 */
export interface LoginResult {
    success: boolean;
    user?: User;
    token?: string;
    refreshToken?: string;
    error?: string;
    isInactive?: boolean;
}

/**
 * Login credentials interface.
 */
export interface LoginCredentials {
    email: string;
    password: string;
    phone: string;
    deviceId: string;
}

/**
 * Authenticate with email, password, phone, and device ID.
 * 
 * FLOW:
 * 1. Send POST /auth/login with email + password + phone + device_id
 * 2. Receive access_token + user
 * 3. Validate user.role === DELIVERY
 * 4. Return token and user on success
 * 
 * @param credentials - User's login credentials
 * @returns Login result with token and user, or error
 */
export async function login(credentials: LoginCredentials): Promise<LoginResult> {
    try {
        const payload: LoginRequest = {
            email: credentials.email.trim(),
            password: credentials.password,
            phone: credentials.phone.trim(),
            device_id: credentials.deviceId,
        };

        console.log('[Auth] Attempting login...');

        const response = await apiClient.post<LoginResponse>('/auth/login', payload);

        const { access_token, refresh_token, user } = response.data;

        // Block admin users from mobile app - they should use admin portal
        if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
            console.log(`[Auth] Admin role denied for mobile app: ${user.role}`);
            throw new RoleNotAllowedError(user.role);
        }

        console.log('[Auth] Login successful');

        return {
            success: true,
            user,
            token: access_token,
            refreshToken: refresh_token,
        };

    } catch (error: any) {
        console.log('[Auth] Login failed:', error);

        // Handle role error specifically
        if (error instanceof RoleNotAllowedError) {
            return {
                success: false,
                error: error.message,
            };
        }

        // Extract error message from API response
        const message = getErrorMessage(error);

        // Check for inactive/deactivated account error
        if (message.toLowerCase().includes('deactivated') || 
            message.toLowerCase().includes('inactive') ||
            message.toLowerCase().includes('not approved')) {
            return {
                success: false,
                error: 'Your account is pending admin approval. Please wait for activation.',
                isInactive: true,
            };
        }

        return {
            success: false,
            error: message,
        };
    }
}
