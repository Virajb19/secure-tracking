'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '@/services/api';
import { analyticsApi, GenderStats, DistrictUserStats } from '@/services/paper-setter.service';
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
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

// Chart colors
const CHART_COLORS = {
    pending: '#eab308',
    inProgress: '#3b82f6',
    completed: '#22c55e',
    suspicious: '#ef4444',
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

    // Fetch gender stats
    const { data: genderStats, isLoading: genderStatsLoading } = useQuery({
        queryKey: ['gender-stats'],
        queryFn: analyticsApi.getGenderStats,
    });

    // Fetch district user stats
    const { data: districtUserStats, isLoading: districtStatsLoading } = useQuery({
        queryKey: ['district-user-stats'],
        queryFn: analyticsApi.getDistrictUserStats,
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

    // Chart data for pie chart
    const pieChartData = [
        { name: 'Completed', value: stats.completed, color: CHART_COLORS.completed },
        { name: 'In Progress', value: stats.inProgress, color: CHART_COLORS.inProgress },
        { name: 'Pending', value: stats.pending, color: CHART_COLORS.pending },
        { name: 'Suspicious', value: stats.suspicious, color: CHART_COLORS.suspicious },
    ];

    // Chart data for bar chart
    const barChartData = [
        { name: 'Pending', value: stats.pending, fill: CHART_COLORS.pending },
        { name: 'In Progress', value: stats.inProgress, fill: CHART_COLORS.inProgress },
        { name: 'Completed', value: stats.completed, fill: CHART_COLORS.completed },
        { name: 'Suspicious', value: stats.suspicious, fill: CHART_COLORS.suspicious },
    ];

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
                        className="p-2 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg"
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
                    className="bg-white dark:bg-linear-to-br dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-lg dark:shadow-xl"
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
                    className="bg-yellow-50 dark:bg-linear-to-br dark:from-yellow-900/20 dark:via-slate-900 dark:to-slate-800 border border-yellow-200 dark:border-yellow-500/30 rounded-xl p-5 shadow-lg dark:shadow-xl"
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
                    className="bg-blue-50 dark:bg-linear-to-br dark:from-blue-900/20 dark:via-slate-900 dark:to-slate-800 border border-blue-200 dark:border-blue-500/30 rounded-xl p-5 shadow-lg dark:shadow-xl"
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
                    className="bg-green-50 dark:bg-linear-to-br dark:from-green-900/20 dark:via-slate-900 dark:to-slate-800 border border-green-200 dark:border-green-500/30 rounded-xl p-5 shadow-lg dark:shadow-xl"
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
                    className="bg-red-50 dark:bg-linear-to-br dark:from-red-900/20 dark:via-slate-900 dark:to-slate-800 border border-red-200 dark:border-red-500/30 rounded-xl p-5 shadow-lg dark:shadow-xl"
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

            {/* Charts Row - Using Recharts */}
            <motion.div 
                className="grid grid-cols-1 lg:grid-cols-2 gap-4"
                variants={itemVariants}
            >
                {/* Bar Chart */}
                <motion.div 
                    className="bg-white dark:bg-linear-to-br dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-lg dark:shadow-xl"
                    variants={cardVariants}
                >
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Task Status Distribution</h3>
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={barChartData} layout="vertical">
                                <XAxis type="number" stroke="#64748b" fontSize={12} />
                                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={80} />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                                        border: '1px solid rgba(51, 65, 85, 0.5)',
                                        borderRadius: '8px',
                                        color: '#fff'
                                    }} 
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </motion.div>

                {/* Pie Chart */}
                <motion.div 
                    className="bg-white dark:bg-linear-to-br dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-lg dark:shadow-xl"
                    variants={cardVariants}
                >
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Task Overview</h3>
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={pieChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}
                                    labelLine={false}
                                >
                                    {pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                                        border: '1px solid rgba(51, 65, 85, 0.5)',
                                        borderRadius: '8px',
                                        color: '#fff'
                                    }} 
                                />
                                <Legend 
                                    verticalAlign="middle" 
                                    align="right"
                                    layout="vertical"
                                    wrapperStyle={{ paddingLeft: '20px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </motion.div>
            </motion.div>

            {/* Analytics Row */}
            <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                variants={itemVariants}
            >
                {/* Teacher-Student Ratio */}
                <motion.div 
                    className="bg-purple-50 dark:bg-linear-to-br dark:from-purple-900/30 dark:via-slate-900 dark:to-slate-800 border border-purple-200 dark:border-purple-500/30 rounded-xl p-6 shadow-lg dark:shadow-xl"
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
                        <div className="h-14 w-14 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                            <Users className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                </motion.div>

                {/* Total Teachers */}
                <motion.div 
                    className="bg-cyan-50 dark:bg-linear-to-br dark:from-cyan-900/30 dark:via-slate-900 dark:to-slate-800 border border-cyan-200 dark:border-cyan-500/30 rounded-xl p-6 shadow-lg dark:shadow-xl"
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
                        <div className="h-14 w-14 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center">
                            <svg className="w-7 h-7 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                    </div>
                </motion.div>

                {/* Total Students */}
                <motion.div 
                    className="bg-amber-50 dark:bg-linear-to-br dark:from-amber-900/30 dark:via-slate-900 dark:to-slate-800 border border-amber-200 dark:border-amber-500/30 rounded-xl p-6 shadow-lg dark:shadow-xl"
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
                        <div className="h-14 w-14 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                            <GraduationCap className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Recent Stats - Gender & District */}
            <motion.div variants={itemVariants}>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Recent Stats</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Gender-wise Pie Chart */}
                    <motion.div 
                        className="bg-white dark:bg-linear-to-br dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-lg dark:shadow-xl"
                        variants={cardVariants}
                    >
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Gender-wise</h3>
                        {genderStatsLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                        ) : genderStats ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Male', value: genderStats.MALE, color: '#3b82f6' },
                                            { name: 'Female', value: genderStats.FEMALE, color: '#ec4899' },
                                            { name: 'Other', value: genderStats.OTHER, color: '#8b5cf6' },
                                        ].filter(item => item.value > 0)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {[
                                            { name: 'Male', value: genderStats.MALE, color: '#3b82f6' },
                                            { name: 'Female', value: genderStats.FEMALE, color: '#ec4899' },
                                            { name: 'Other', value: genderStats.OTHER, color: '#8b5cf6' },
                                        ].filter(item => item.value > 0).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                                            border: '1px solid rgba(51, 65, 85, 0.5)',
                                            borderRadius: '8px',
                                            color: '#fff'
                                        }} 
                                    />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        align="center"
                                        layout="horizontal"
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-64 text-slate-400">
                                No data available
                            </div>
                        )}
                    </motion.div>

                    {/* District-wise Histogram */}
                    <motion.div 
                        className="bg-white dark:bg-linear-to-br dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-lg dark:shadow-xl"
                        variants={cardVariants}
                    >
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Number of Users District-Wise</h3>
                        {districtStatsLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                        ) : districtUserStats && districtUserStats.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart 
                                    data={districtUserStats.map(d => ({ 
                                        name: d.district_name, 
                                        value: d.user_count 
                                    }))}
                                    margin={{ top: 5, right: 20, left: 10, bottom: 60 }}
                                >
                                    <XAxis 
                                        dataKey="name" 
                                        stroke="#64748b" 
                                        fontSize={10} 
                                        angle={-45}
                                        textAnchor="end"
                                        interval={0}
                                        height={60}
                                    />
                                    <YAxis stroke="#64748b" fontSize={12} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                                            border: '1px solid rgba(51, 65, 85, 0.5)',
                                            borderRadius: '8px',
                                            color: '#fff'
                                        }} 
                                    />
                                    <Legend 
                                        verticalAlign="top"
                                        align="right"
                                        wrapperStyle={{ paddingBottom: '10px' }}
                                    />
                                    <Bar 
                                        dataKey="value" 
                                        fill="#60a5fa" 
                                        radius={[4, 4, 0, 0]}
                                        name="Number of Users District-Wise"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-64 text-slate-400">
                                No data available
                            </div>
                        )}
                    </motion.div>
                </div>
            </motion.div>

            {/* Recent Tasks */}
            <motion.div 
                className="bg-white dark:bg-linear-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-lg dark:shadow-xl"
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
