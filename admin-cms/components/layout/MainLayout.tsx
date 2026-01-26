'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useNavigationStore, useAuthStore } from '@/lib/store';
import Sidebar from './Sidebar';
import Header from './Header';
import Image from 'next/image';

interface MainLayoutProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
}

function NavigationLoader() {
    const isNavigating = useNavigationStore((state) => state.isNavigating);

    if (!isNavigating) return null;

    return (
        <div className="fixed inset-0 ml-64 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" />
            <div className="relative z-10">
                <Image
                    src="/Spinner@1x-1.0s-200px-200px.png"
                    alt="Loading..."
                    width={100}
                    height={100}
                    className="animate-spin"
                    priority
                />
            </div>
        </div>
    );
}

export default function MainLayout({ children }: MainLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const loading = useAuthStore((state) => state.loading);
    const hydrate = useAuthStore((state) => state.hydrate);
    const stopNavigation = useNavigationStore((state) => state.stopNavigation);

    // Hydrate auth on mount
    useEffect(() => {
        hydrate();
    }, [hydrate]);

    // Stop navigation when pathname changes
    useEffect(() => {
        stopNavigation();
    }, [pathname, stopNavigation]);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && !isAuthenticated()) {
            router.push('/login');
        }
    }, [isAuthenticated, loading, router]);

    // Show loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Image
                        src="/Spinner@1x-1.0s-200px-200px.png"
                        alt="Loading..."
                        width={100}
                        height={100}
                        className="animate-spin"
                        priority
                    />
                </div>
            </div>
        );
    }

    // Don't render if not authenticated (will redirect)
    if (!isAuthenticated()) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div className="ml-64 flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
            <NavigationLoader />
        </div>
    );
}
