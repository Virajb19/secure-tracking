'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavigationStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';

// Navigation items for admin sidebar
const navItems = [
    {
        name: 'Dashboard',
        href: '/dashboard',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        name: 'Users',
        href: '/users',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        ),
    },
    {
        name: 'Form 6',
        href: '/form-6',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
    },
    {
        name: 'Circulars',
        href: '/circulars',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
        ),
    },
    {
        name: 'Events',
        href: '/events',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
    },
    {
        name: 'Notifications',
        href: '/notifications',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
        ),
    },
    {
        name: 'Tasks',
        href: '/tasks',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
        ),
    },
    {
        name: 'Audit Logs',
        href: '/audit-logs',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
    },
    {
        name: 'Helpdesk',
        href: '/helpdesk',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
];

// Paper Setters submenu items
const paperSettersSubItems = [
    { name: 'View Setters / Checkers', href: '/paper-setters' },
    { name: 'School-Wise Records', href: '/paper-setters/school-wise' },
];

// Question Paper Tracking submenu items
const questionPaperSubItems = [
    { name: 'Regular Exams', href: '/question-paper-tracking' },
    { name: 'Compartmental Exams', href: '/question-paper-tracking/compartmental' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const startNavigation = useNavigationStore((state) => state.startNavigation);
    const [paperSettersOpen, setPaperSettersOpen] = useState(pathname.startsWith('/paper-setters'));
    const [questionPaperOpen, setQuestionPaperOpen] = useState(pathname.startsWith('/question-paper-tracking'));

    const isPaperSettersActive = pathname.startsWith('/paper-setters');
    const isQuestionPaperActive = pathname.startsWith('/question-paper-tracking');

    const handleNavClick = (href: string) => {
        // Only show loader when navigating to a different page
        // and the page requires data fetching
        if (pathname !== href && !pathname.startsWith(href + '/')) {
            startNavigation();
        }
    };

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-72 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-slate-800/50">
            {/* Logo / Brand */}
            <div className="flex h-20 items-center justify-center border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white">Secure Track</h1>
                        <p className="text-xs text-blue-400">Admin CMS</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col h-[calc(100vh-5rem)] justify-between p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                <ul className="space-y-2">
                    {navItems.slice(0, 6).map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    onClick={() => handleNavClick(item.href)}
                                    className={`flex items-center gap-3 px-4 py-3 border rounded-xl transition-all duration-200 ${isActive
                                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-transparent shadow-lg shadow-blue-500/20'
                                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-white border-slate-700 hover:border-slate-600'
                                        }`}
                                >
                                    {item.icon}
                                    <span className="font-medium">{item.name}</span>
                                </Link>
                            </li>
                        );
                    })}

                    {/* Paper Setters with submenu */}
                    <li>
                        <button
                            onClick={() => setPaperSettersOpen(!paperSettersOpen)}
                            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isPaperSettersActive
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white border border-slate-700 hover:border-slate-600'
                                }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="font-medium truncate">Paper Setters / Checkers</span>
                            </div>
                            <svg 
                                className={`w-4 h-4 transition-transform ${paperSettersOpen ? 'rotate-180' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        
                        {/* Submenu */}
                        <AnimatePresence>
                            {paperSettersOpen && (
                                <motion.ul 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="mt-2 ml-4 space-y-1 border-l-2 border-slate-700/50 pl-3 overflow-hidden"
                                >
                                    {paperSettersSubItems.map((subItem, index) => {
                                        const isSubActive = pathname === subItem.href;
                                        return (
                                            <motion.li 
                                                key={subItem.name}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                            >
                                                <Link
                                                    href={subItem.href}
                                                    onClick={() => handleNavClick(subItem.href)}
                                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${isSubActive
                                                            ? 'bg-blue-600/20 text-blue-400 font-medium'
                                                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
                                                        }`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isSubActive ? 'bg-blue-400' : 'bg-current'}`}></span>
                                                    <span>{subItem.name}</span>
                                                </Link>
                                            </motion.li>
                                        );
                                    })}
                                </motion.ul>
                            )}
                        </AnimatePresence>
                    </li>

                    {/* Question Paper Tracking with submenu */}
                    <li>
                        <button
                            onClick={() => setQuestionPaperOpen(!questionPaperOpen)}
                            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isQuestionPaperActive
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white border border-slate-700 hover:border-slate-600'
                                }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                                <span className="font-medium truncate">Question Paper Tracking</span>
                            </div>
                            <svg 
                                className={`w-4 h-4 transition-transform ${questionPaperOpen ? 'rotate-180' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        
                        {/* Submenu */}
                        <AnimatePresence>
                            {questionPaperOpen && (
                                <motion.ul 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="mt-2 ml-4 space-y-1 border-l-2 border-slate-700/50 pl-3 overflow-hidden"
                                >
                                    {questionPaperSubItems.map((subItem, index) => {
                                        const isSubActive = pathname === subItem.href;
                                        return (
                                            <motion.li 
                                                key={subItem.name}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                            >
                                                <Link
                                                    href={subItem.href}
                                                    onClick={() => handleNavClick(subItem.href)}
                                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${isSubActive
                                                            ? 'bg-blue-600/20 text-blue-400 font-medium'
                                                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
                                                        }`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isSubActive ? 'bg-blue-400' : 'bg-current'}`}></span>
                                                    <span>{subItem.name}</span>
                                                </Link>
                                            </motion.li>
                                        );
                                    })}
                                </motion.ul>
                            )}
                        </AnimatePresence>
                    </li>

                    {navItems.slice(6).map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    onClick={() => handleNavClick(item.href)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-white border border-slate-700 hover:border-slate-600'
                                        }`}
                                >
                                    {item.icon}
                                    <span className="font-medium">{item.name}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
}
