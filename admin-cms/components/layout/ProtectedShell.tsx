'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useNavigationStore, useAuthStore } from '@/lib/store';

function NavigationLoader() {
  const isNavigating = useNavigationStore((state) => state.isNavigating);

  if (!isNavigating) return null;

  return (
    <div className="fixed inset-0 ml-72 z-50 flex items-center justify-center">
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" />

      {/* Infinity Spinner */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <img
          src="/Infinity@1x-1.0s-200px-200px.svg"
          alt="Loading..."
          width={120}
          height={120}
          className="drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
        />
        <p className="text-blue-400 text-lg font-medium animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}

interface ProtectedShellProps {
  children: ReactNode;
}

export default function ProtectedShell({ children }: ProtectedShellProps) {
  const pathname = usePathname();
  const stopNavigation = useNavigationStore((state) => state.stopNavigation);
  const hydrate = useAuthStore((state) => state.hydrate);

  // Hydrate auth store on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Stop navigation when pathname changes
  useEffect(() => {
    stopNavigation();
  }, [pathname, stopNavigation]);

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar />
      <div className="ml-72 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      <NavigationLoader />
    </div>
  );
}
