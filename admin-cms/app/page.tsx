'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Image from 'next/image';

export default function HomePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loading = useAuthStore((state) => state.loading);
  const hydrate = useAuthStore((state) => state.hydrate);

  // Hydrate auth on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated()) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, loading, router]);

  // Show loading while checking auth
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/Spinner@1x-1.0s-200px-200px.svg"
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
