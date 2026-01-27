'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavigationStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { Home, Users, ClipboardList, PenLine, Calendar, Bell, Target, FileText, HelpCircle, ScrollText, CheckSquare } from "lucide-react";

// Navigation items for admin sidebar
const navItems = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Users", href: "/users", icon: Users },
  { name: "Form 6", href: "/form-6", icon: ClipboardList },
  { name: "Circulars", href: "/circulars", icon: PenLine },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Audit Logs", href: "/audit-logs", icon: ScrollText }, 
  { name: "Helpdesk", href: "/helpdesk", icon: HelpCircle },
];


// Icon component 
type IconAnimation = "seesaw" | "bounce" | "rotate";

function Icon({ icon , isActive, animation = "seesaw" }: { icon: React.ReactNode; isActive: boolean, animation?: IconAnimation }) {
    return (
        <span className={twMerge("border rounded-full p-2", 
              isActive && "border-transparent bg-blue-500",
              animation === "seesaw" && "group-hover:motion-preset-seesaw-lg",
              animation === "bounce" && "group-hover:motion-preset-bounce",
              animation === "rotate" && "group-hover:motion-rotate-in-[1turn]"
            )}>
            {icon}
        </span>
    );
}

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
        <aside className="fixed left-0 top-0 z-40 h-screen w-72 bg-linear-to-b from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border-r border-slate-200 dark:border-slate-800/50">
            {/* Logo / Brand */}
            <div className="flex h-20 items-center justify-center border-b-[3px] border-slate-100 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Secure Track</h1>
                        <p className="text-xs text-blue-600 dark:text-blue-400">Admin CMS</p>
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
                                    className={`flex group items-center gap-3 px-4 py-3 border rounded-xl transition-all duration-200 ${isActive
                                            ? 'bg-linear-to-r from-blue-600 to-blue-700 text-white border-transparent shadow-lg shadow-blue-500/20'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                >
                                     <Icon icon={<item.icon className="w-5 h-5" />} isActive={isActive} />
                                    <span className="font-medium">{item.name}</span>
                                </Link>
                            </li>
                        );
                    })}

                    {/* Paper Setters with submenu */}
                    <li>
                        <button
                            onClick={() => setPaperSettersOpen(!paperSettersOpen)}
                            className={`w-full flex group items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isPaperSettersActive
                                    ? 'bg-linear-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                 <Icon icon={<FileText className="w-5 h-5" />} isActive={isPaperSettersActive} />
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
                                    className="mt-2 ml-4 space-y-1 border-l-2 border-slate-200 dark:border-slate-700/50 pl-3 overflow-hidden"
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
                                                            ? 'bg-blue-600/20 text-blue-600 dark:text-blue-400 font-medium'
                                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-300'
                                                        }`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isSubActive ? 'bg-blue-500 dark:bg-blue-400' : 'bg-current'}`}></span>
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
                            className={`w-full flex group items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isQuestionPaperActive
                                    ? 'bg-linear-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <Icon icon={<Target className="w-5 h-5" />} isActive={isQuestionPaperActive} animation='bounce' />
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
                                    className="mt-2 ml-4 space-y-1 border-l-2 border-slate-200 dark:border-slate-700/50 pl-3 overflow-hidden"
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
                                                            ? 'bg-blue-600/20 text-blue-600 dark:text-blue-400 font-medium'
                                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-300'
                                                        }`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isSubActive ? 'bg-blue-500 dark:bg-blue-400' : 'bg-current'}`}></span>
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
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                        const animation = item.name === "Helpdesk" ? "rotate" : "seesaw"

                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    onClick={() => handleNavClick(item.href)}
                                    className={`flex group items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 ${isActive
                                            ? 'bg-linear-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                >
                                    <Icon icon={<item.icon className="w-5 h-5" />} isActive={isActive} animation={animation} />
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
