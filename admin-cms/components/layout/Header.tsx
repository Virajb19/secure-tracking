'use client';

import { useAuthStore } from '@/lib/store';
import Image from 'next/image';
import { LogoutButton } from '@/components/LogoutButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Helper function to get greeting based on time of day
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
}

export default function Header() {
    const role = useAuthStore((state) => state.role);
    const userName = useAuthStore((state) => state.userName);
    const userProfilePic = useAuthStore((state) => state.userProfilePic);
    const [greeting, setGreeting] = useState('Welcome');

    useEffect(() => {
        setGreeting(getGreeting());
    }, []);

    // Animation variants for container
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
            },
        },
    };

    // Animation variants for text elements
    const textVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: 'spring' as const,
                stiffness: 100,
                damping: 12,
            },
        },
    };

    // Wave animation for the hand emoji
    const waveVariants = {
        wave: {
            rotate: [0, 14, -8, 14, -4, 10, 0],
            transition: {
                duration: 1.5,
                repeat: Infinity,
                repeatDelay: 3,
            },
        },
    };

    return (
        <header className="sticky top-0 z-30 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
            <div className="flex h-19 items-center justify-between px-6">

                {/* Left side - Animated Welcome Message */}
                <motion.div
                    className="flex items-center gap-2"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >

                   <motion.span
                        className="text-2xl md:text-3xl"
                        variants={waveVariants}
                        animate="wave"
                        style={{ display: 'inline-block', originX: 0.7, originY: 0.7 }}
                    >
                        👋
                    </motion.span>

                    <motion.h1
                        className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white"
                        variants={textVariants}
                    >
                        {greeting}, <span className="uppercase bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">{userName || 'Administrator'}</span>
                    </motion.h1>
                </motion.div>

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
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 border-2 border-slate-200 dark:border-slate-700">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
