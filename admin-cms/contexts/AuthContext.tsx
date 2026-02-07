'use client';

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/services/api';
import { UserRole } from '@/types';

// ========================================
// TYPES
// ========================================

interface AuthContextType {
    role: UserRole | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (email: string, password: string, phone?: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ========================================
// PROVIDER
// ========================================

export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();

    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);

    // ----------------------------------------
    // INIT AUTH FROM localStorage
    // ----------------------------------------
    useEffect(() => {
        const storedRole = localStorage.getItem('userRole') as UserRole | null;

        if (storedRole === 'ADMIN' || storedRole === 'SUPER_ADMIN') {
            setRole(storedRole);
        }

        setLoading(false);
    }, []);

    // ----------------------------------------
    // LOGIN
    // ----------------------------------------
    const login = async (email: string, password: string, phone?: string) => {
        const res = await authApi.login(email, password, phone);

        // accessToken & refreshToken → HttpOnly cookies (set by backend).
        // User info → localStorage for UI display.
        const userRole = res.user.role;

        localStorage.setItem('userRole', userRole);

        // Also set userRole cookie for SSR route guards
        const expires = new Date(Date.now() + 7 * 864e5).toUTCString();
        document.cookie = `userRole=${encodeURIComponent(userRole)}; expires=${expires}; path=/; SameSite=Lax`;

        setRole(userRole);

        return
    };

    // ----------------------------------------
    // LOGOUT
    // ----------------------------------------
    const logout = async () => {
        // Backend clears HttpOnly auth cookies
        await authApi.logout();

        // Clear localStorage & SSR role cookie
        localStorage.removeItem('userRole');
        document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';

        setRole(null);

        router.push('/login');
    };

    return (
        <AuthContext.Provider
            value={{
                role,
                isAuthenticated: Boolean(role === 'ADMIN' || role === 'SUPER_ADMIN'),
                loading,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// ========================================
// HOOK
// ========================================

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used inside AuthProvider');
    }
    return ctx;
}
