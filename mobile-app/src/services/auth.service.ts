/**
 * Authentication Service
 * 
 * Handles login API call.
 * 
 * SECURITY NOTES:
 * - Phone + device_id are REQUIRED
 * - Backend validates and binds device on first login
 * - Role check happens here - only DELIVERY role allowed
 */

import apiClient, { getErrorMessage } from '../api/client';
import { LoginRequest, LoginResponse, User } from '../types';
import { USER_ROLES } from '../constants/config';

/**
 * Custom error for role-based access denial.
 */
export class RoleNotAllowedError extends Error {
    constructor(role: string) {
        super(`This app is for delivery personnel only. Your role: ${role}`);
        this.name = 'RoleNotAllowedError';
    }
}

/**
 * Login result type.
 */
export interface LoginResult {
    success: boolean;
    user?: User;
    token?: string;
    error?: string;
}

/**
 * Authenticate with phone and device ID.
 * 
 * FLOW:
 * 1. Send POST /auth/login with phone + device_id
 * 2. Receive access_token + user
 * 3. Validate user.role === DELIVERY
 * 4. Return token and user on success
 * 
 * @param phone - User's phone number
 * @param deviceId - Device's unique identifier
 * @returns Login result with token and user, or error
 */
export async function login(phone: string, deviceId: string): Promise<LoginResult> {
    try {
        const payload: LoginRequest = {
            phone: phone.trim(),
            device_id: deviceId,
        };

        console.log('[Auth] Attempting login...');

        const response = await apiClient.post<LoginResponse>('/auth/login', payload);

        const { access_token, user } = response.data;

        // CRITICAL: Block non-DELIVERY users
        // This check is client-side but backend also enforces it
        if (user.role !== USER_ROLES.DELIVERY) {
            console.log(`[Auth] Role denied: ${user.role}`);
            throw new RoleNotAllowedError(user.role);
        }

        console.log('[Auth] Login successful');

        return {
            success: true,
            user,
            token: access_token,
        };

    } catch (error) {
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

        return {
            success: false,
            error: message,
        };
    }
}
