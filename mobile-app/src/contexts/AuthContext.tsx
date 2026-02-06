/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the app.
 * 
 * RESPONSIBILITIES:
 * - Initialize device ID on app start
 * - Check for existing auth on app start
 * - Provide login/logout functions
 * - Expose auth state (user, isAuthenticated, isLoading)
 * 
 * SECURITY NOTES:
 * - Uses SecureStore for all sensitive data
 * - Device ID is generated once and never changes
 * - Token persistence survives app restarts
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User } from '../types';
import { login as authLogin, LoginCredentials } from '../services/auth.service';
import { getDeviceId } from '../utils/device';
import {
    getAccessToken,
    storeAccessToken,
    storeRefreshToken,
    getUserData,
    storeUserData,
    clearAuthData,
} from '../utils/storage';
// Push notifications disabled - Firebase not configured
// import {
//     initializePushNotifications,
//     removePushToken,
// } from '../services/notification.service';
import apiClient from '../api/client';

/**
 * Login credentials for AuthContext.
 */
interface LoginParams {
    email: string;
    password: string;
    phone: string;
}

/**
 * Login result with isInactive flag for toast handling.
 */
interface LoginResult {
    success: boolean;
    error?: string;
    isInactive?: boolean;
}

/**
 * Auth context interface.
 */
interface AuthContextType {
    /** Current authenticated user */
    user: User | null;
    /** Whether user is authenticated */
    isAuthenticated: boolean;
    /** Whether auth state is being loaded/checked */
    isLoading: boolean;
    /** Device ID (for display/debug) */
    deviceId: string | null;
    /** Login function */
    login: (params: LoginParams) => Promise<LoginResult>;
    /** Logout function */
    logout: () => Promise<void>;
    /** Refresh user data from storage */
    refreshUser: () => Promise<void>;
}

/**
 * Auth context with default values.
 */
const AuthContext = createContext<AuthContextType>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    deviceId: null,
    login: async () => ({ success: false, error: 'Context not initialized', isInactive: false }),
    logout: async () => { },
    refreshUser: async () => { },
});

/**
 * Auth provider props.
 */
interface AuthProviderProps {
    children: ReactNode;
}

/**
 * Authentication Provider Component.
 * 
 * Wraps the app and provides auth state.
 */
export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [deviceId, setDeviceId] = useState<string | null>(null);

    /**
     * Initialize auth state on app start.
     */
    useEffect(() => {
        initializeAuth();
    }, []);

    /**
     * Initialize authentication.
     * - Generate/retrieve device ID
     * - Check for existing token
     * - Load cached user data
     */
    const initializeAuth = async () => {
        try {
            console.log('[Auth] Initializing...');

            // Get or generate device ID
            const id = await getDeviceId();
            setDeviceId(id);
            console.log('[Auth] Device ID ready');

            // Check for existing token
            const token = await getAccessToken();
            if (token) {
                console.log('[Auth] Found existing token');

                // Load cached user data
                const userData = await getUserData();
                if (userData) {
                    setUser(userData);
                    console.log('[Auth] Restored user session');
                }
            } else {
                console.log('[Auth] No existing session');
            }
        } catch (error) {
            console.error('[Auth] Initialization error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Login with email, password, and phone number.
     * Device ID is automatically included.
     */
    const login = useCallback(async (params: LoginParams): Promise<LoginResult> => {
        if (!deviceId) {
            return { success: false, error: 'Device not initialized. Please restart the app.' };
        }

        try {
            setIsLoading(true);

            const credentials: LoginCredentials = {
                email: params.email,
                password: params.password,
                phone: params.phone,
                deviceId: deviceId,
            };

            const result = await authLogin(credentials);

            if (result.success && result.token && result.user) {
                // Store tokens and user data
                await storeAccessToken(result.token);
                if (result.refreshToken) {
                    await storeRefreshToken(result.refreshToken);
                }
                await storeUserData(result.user);

                // Update state
                setUser(result.user);

                // Push notifications disabled - Firebase not configured
                // initializePushNotifications().catch(err => {
                //     console.error('[Auth] Failed to initialize push notifications:', err);
                // });

                return { success: true };
            }

            return { success: false, error: result.error, isInactive: result.isInactive };

        } catch (error) {
            console.error('[Auth] Login error:', error);
            return { success: false, error: 'An unexpected error occurred.' };
        } finally {
            setIsLoading(false);
        }
    }, [deviceId]);

    /**
     * Logout and clear all auth data.
     */
    const logout = useCallback(async () => {
        try {
            console.log('[Auth] Logging out...');

            // Call logout API to log the action
            try {
                const token = await getAccessToken();
                if (token) {
                    await apiClient.post('/auth/logout');
                }
            } catch (error) {
                console.error('[Auth] Failed to log logout action:', error);
            }

            // Push notifications disabled - Firebase not configured
            // await removePushToken().catch(err => {
            //     console.error('[Auth] Failed to remove push token:', err);
            // });

            // Clear all auth data (but NOT device_id)
            await clearAuthData();

            // Clear state
            setUser(null);

            console.log('[Auth] Logged out successfully');
        } catch (error) {
            console.error('[Auth] Logout error:', error);
        }
    }, []);

    /**
     * Refresh user data from storage.
     * Used after admin activates the user.
     */
    const refreshUser = useCallback(async () => {
        try {
            const userData = await getUserData();
            if (userData) {
                setUser(userData);
                console.log('[Auth] User data refreshed');
            }
        } catch (error) {
            console.error('[Auth] Failed to refresh user:', error);
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: user !== null,
                isLoading,
                deviceId,
                login,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Hook to access auth context.
 */
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}

export default AuthContext;
