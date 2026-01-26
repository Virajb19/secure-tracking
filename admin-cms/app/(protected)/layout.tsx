'use client';

import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useRouter } from "nextjs-toploader/app";
import { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";

export default function ProtectedLayout({children}: {children: ReactNode}) {

  // Make this layout server side

  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login?reason=auth");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar />
      <main className="ml-64 p-6">
        {children}
      </main>
    </div>
  );
}