'use client';

import { useAuthStore } from '@/lib/store';
import Image from 'next/image';
import { LogoutButton } from '@/components/LogoutButton';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Header() {
    const role = useAuthStore((state) => state.role);
    const userName = useAuthStore((state) => state.userName);
    const userProfilePic = useAuthStore((state) => state.userProfilePic);

    return (
        <header className="sticky top-0 z-30 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
            <div className="flex h-19 items-center justify-between px-6">
                {/* Left side - can be used for breadcrumbs or page title */}
                <div />

                {/* User Info & Logout */}
                <div className="flex items-center gap-4">
                    {/* Theme Toggle */}
                    <ThemeToggle />

                    {/* Divider */}
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />

                    <div className="flex items-center gap-3">
                        {/* Profile Picture or Default Icon */}
                        {userProfilePic ? (
                            <Image
                                src={userProfilePic}
                                alt={userName || 'User'}
                                width={40}
                                height={40}
                                className="rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                            />
                        ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 border-2 border-slate-200 dark:border-slate-700">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        )}
                        
                        {/* User Name & Role */}
                        <div className="hidden sm:block">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{userName || 'Administrator'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{role?.replace('_', ' ')}</p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />

                    {/* Logout Button */}
                    <LogoutButton />
                </div>
            </div>
        </header>
    );
}
