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
    token: string | null;
    role: UserRole | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (email: string, password: string, phone?: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ========================================
// PROVIDER
// ========================================

export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();

    const [token, setToken] = useState<string | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);

    // ----------------------------------------
    // INIT AUTH FROM localStorage
    // ----------------------------------------
    useEffect(() => {
        const storedToken = localStorage.getItem('accessToken');
        const storedRole = localStorage.getItem('userRole') as UserRole | null;

        if (storedToken && (storedRole === 'ADMIN' || storedRole === 'SUPER_ADMIN')) {
            setToken(storedToken);
            setRole(storedRole);
        }

        setLoading(false);
    }, []);

    // ----------------------------------------
    // LOGIN
    // ----------------------------------------
    const login = async (email: string, password: string, phone?: string) => {
        const res = await authApi.login(email, password, phone);

        // Map snake_case response to camelCase storage/state
        const accessToken = res.access_token;
        const userRole = res.user.role;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('userRole', userRole);

        setToken(accessToken);
        setRole(userRole);

        return
    };

    // ----------------------------------------
    // LOGOUT
    // ----------------------------------------
    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userRole');

        setToken(null);
        setRole(null);

        router.push('/login');
    };

    return (
        <AuthContext.Provider
            value={{
                token,
                role,
                isAuthenticated: Boolean(token && (role === 'ADMIN' || role === 'SUPER_ADMIN')),
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
