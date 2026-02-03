'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import ProtectedShell from '@/components/layout/ProtectedShell';
import { useAuthStore } from '@/lib/store';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loading = useAuthStore((state) => state.loading);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate auth store on mount
  useEffect(() => {
    hydrate();
    setIsHydrated(true);
  }, [hydrate]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isHydrated && !loading && !isAuthenticated()) {
      router.push('/login?reason=auth');
    }
  }, [isHydrated, loading, isAuthenticated, router]);

  // Show loading while checking auth
  if (!isHydrated || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!isAuthenticated()) {
    return null;
  }

  return <ProtectedShell>{children}</ProtectedShell>;
}