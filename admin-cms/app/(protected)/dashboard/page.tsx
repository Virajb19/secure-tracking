'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '@/services/api';
import { analyticsApi } from '@/services/paper-setter.service';
import { Task, TaskStatus } from '@/types';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
    LayoutDashboard, 
    Clock, 
    Zap, 
    CheckCircle2, 
    AlertTriangle,
    Users,
    GraduationCap,
    Package,
    ArrowRight,
    Loader2
} from 'lucide-react';

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
        opacity: 1, 
        scale: 1,
        transition: { duration: 0.3 }
    }
};

// Status badge colors
const statusColors: Record<TaskStatus, string> = {
    [TaskStatus.PENDING]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    [TaskStatus.IN_PROGRESS]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    [TaskStatus.COMPLETED]: 'bg-green-500/20 text-green-400 border-green-500/30',
    [TaskStatus.SUSPICIOUS]: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function DashboardPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Fetch analytics data
    const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
        queryKey: ['dashboard-analytics'],
        queryFn: analyticsApi.getTeacherStudentRatio,
    });

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const data = await tasksApi.getAll();
                setTasks(data);
            } catch {
                setError('Failed to load tasks');
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, []);

    // Calculate stats
    const stats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
        inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
        completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
        suspicious: tasks.filter(t => t.status === TaskStatus.SUSPICIOUS).length,
    };

    // Get recent tasks (last 5)
    const recentTasks = [...tasks]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

    return (
        <motion.div 
            className="space-y-6 p-2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={itemVariants}>
                <div className="flex items-center gap-3">
                    <motion.div
                        className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg"
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <LayoutDashboard className="h-6 w-6 text-white" />
                    </motion.div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Overview of delivery operations</p>
                    </div>
                </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
                variants={itemVariants}
            >
                {/* Total Tasks */}
                <motion.div 
                    className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-lg dark:shadow-xl"
                    variants={cardVariants}
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Tasks</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                                {loading ? '-' : stats.total}
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center">
                            <Package className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                        </div>
                    </div>
                </motion.div>

                {/* Pending */}
                <motion.div 
                    className="bg-yellow-50 dark:bg-gradient-to-br dark:from-yellow-900/20 dark:via-slate-900 dark:to-slate-800 border border-yellow-200 dark:border-yellow-500/30 rounded-xl p-5 shadow-lg dark:shadow-xl"
                    variants={cardVariants}
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-yellow-600 dark:text-yellow-400">Pending</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                                {loading ? '-' : stats.pending}
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                    </div>
                </motion.div>

                {/* In Progress */}
                <motion.div 
                    className="bg-blue-50 dark:bg-gradient-to-br dark:from-blue-900/20 dark:via-slate-900 dark:to-slate-800 border border-blue-200 dark:border-blue-500/30 rounded-xl p-5 shadow-lg dark:shadow-xl"
                    variants={cardVariants}
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 dark:text-blue-400">In Progress</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                                {loading ? '-' : stats.inProgress}
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                            <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </motion.div>

                {/* Completed */}
                <motion.div 
                    className="bg-green-50 dark:bg-gradient-to-br dark:from-green-900/20 dark:via-slate-900 dark:to-slate-800 border border-green-200 dark:border-green-500/30 rounded-xl p-5 shadow-lg dark:shadow-xl"
                    variants={cardVariants}
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 dark:text-green-400">Completed</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                                {loading ? '-' : stats.completed}
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </motion.div>

                {/* Suspicious */}
                <motion.div 
                    className="bg-red-50 dark:bg-gradient-to-br dark:from-red-900/20 dark:via-slate-900 dark:to-slate-800 border border-red-200 dark:border-red-500/30 rounded-xl p-5 shadow-lg dark:shadow-xl"
                    variants={cardVariants}
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-red-600 dark:text-red-400">Suspicious</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                                {loading ? '-' : stats.suspicious}
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Analytics Row */}
            <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                variants={itemVariants}
            >
                {/* Teacher-Student Ratio */}
                <motion.div 
                    className="bg-gradient-to-br from-purple-900/30 via-slate-100 dark:via-slate-900 to-slate-50 dark:to-slate-800 border border-purple-500/30 rounded-xl p-6 shadow-xl"
                    variants={cardVariants}
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Teacher-Student Ratio</p>
                            <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2">
                                {analyticsLoading ? (
                                    <Loader2 className="w-8 h-8 animate-spin text-purple-500 dark:text-purple-400" />
                                ) : analyticsData?.ratio ? (
                                    analyticsData.ratio
                                ) : (
                                    <span className="text-slate-400">N/A</span>
                                )}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                {analyticsLoading ? 'Loading...' : analyticsData?.totalTeachers !== undefined
                                    ? `${analyticsData.totalTeachers?.toLocaleString()} teachers : ${analyticsData.totalStudents?.toLocaleString()} students` 
                                    : 'No data available'}
                            </p>
                        </div>
                        <div className="h-14 w-14 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <Users className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                </motion.div>

                {/* Total Teachers */}
                <motion.div 
                    className="bg-gradient-to-br from-cyan-900/30 via-slate-100 dark:via-slate-900 to-slate-50 dark:to-slate-800 border border-cyan-500/30 rounded-xl p-6 shadow-xl"
                    variants={cardVariants}
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-cyan-600 dark:text-cyan-400 font-medium">Total Teachers</p>
                            <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2">
                                {analyticsLoading ? (
                                    <Loader2 className="w-8 h-8 animate-spin text-cyan-500 dark:text-cyan-400" />
                                ) : analyticsData?.totalTeachers !== undefined ? (
                                    analyticsData.totalTeachers.toLocaleString()
                                ) : (
                                    <span className="text-slate-400">N/A</span>
                                )}
                            </p>
                        </div>
                        <div className="h-14 w-14 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                            <svg className="w-7 h-7 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                    </div>
                </motion.div>

                {/* Total Students */}
                <motion.div 
                    className="bg-gradient-to-br from-amber-900/30 via-slate-100 dark:via-slate-900 to-slate-50 dark:to-slate-800 border border-amber-500/30 rounded-xl p-6 shadow-xl"
                    variants={cardVariants}
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Total Students</p>
                            <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2">
                                {analyticsLoading ? (
                                    <Loader2 className="w-8 h-8 animate-spin text-amber-500 dark:text-amber-400" />
                                ) : analyticsData?.totalStudents !== undefined ? (
                                    analyticsData.totalStudents.toLocaleString()
                                ) : (
                                    <span className="text-slate-400">N/A</span>
                                )}
                            </p>
                        </div>
                        <div className="h-14 w-14 rounded-xl bg-amber-500/20 flex items-center justify-center">
                            <GraduationCap className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Recent Tasks */}
            <motion.div 
                className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-lg dark:shadow-xl"
                variants={cardVariants}
            >
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Tasks</h2>
                    </div>
                    <motion.div whileHover={{ x: 5 }}>
                        <Link
                            href="/tasks"
                            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
                        >
                            View All
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </motion.div>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="inline-block"
                        >
                            <Loader2 className="h-8 w-8 text-blue-500" />
                        </motion.div>
                        <p className="text-slate-500 dark:text-slate-400 mt-3">Loading tasks...</p>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center">
                        <AlertTriangle className="h-10 w-10 text-red-500 dark:text-red-400 mx-auto mb-3" />
                        <p className="text-red-500 dark:text-red-400">{error}</p>
                    </div>
                ) : recentTasks.length === 0 ? (
                    <div className="p-12 text-center">
                        <Package className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400">No tasks found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {recentTasks.map((task, index) => (
                            <motion.div
                                key={task.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Link
                                    href={`/tasks/${task.id}`}
                                    className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-700/80 transition-colors">
                                            <Package className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {task.sealed_pack_code}
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {task.source_location} → {task.destination_location}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[task.status]}`}>
                                        {task.status.replace('_', ' ')}
                                    </span>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
