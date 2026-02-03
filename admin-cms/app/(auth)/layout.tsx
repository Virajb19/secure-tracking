'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import { useAuthStore } from "@/lib/store";

export default function AuthLayout({children}: {children: ReactNode}) {
   const router = useRouter();
   const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
   const hydrate = useAuthStore((state) => state.hydrate);
   const loading = useAuthStore((state) => state.loading);
   const [isHydrated, setIsHydrated] = useState(false);

   useEffect(() => {
       hydrate();
       setIsHydrated(true);
   }, [hydrate]);

   useEffect(() => {
       if (isHydrated && !loading && isAuthenticated()) {
           router.replace('/dashboard');
       }
   }, [isHydrated, loading, isAuthenticated, router]);

   // Show loading while checking
   if (!isHydrated || loading) {
       return (
           <div className="min-h-screen bg-slate-950 flex items-center justify-center">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
           </div>
       );
   }

   // If authenticated, don't render login page (will redirect)
   if (isAuthenticated()) {
       return null;
   }

   return <div className="relative overflow-hidden">
       {children}
   </div>
}