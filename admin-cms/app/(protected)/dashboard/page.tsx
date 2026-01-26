'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';
import { tasksApi } from '@/services/api';
import { analyticsApi } from '@/services/paper-setter.service';
import { Task, TaskStatus } from '@/types';
import Link from 'next/link';

// Status badge colors
const statusColors: Record<TaskStatus, string> = {
    [TaskStatus.PENDING]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    [TaskStatus.IN_PROGRESS]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    [TaskStatus.COMPLETED]: 'bg-green-500/20 text-green-400 border-green-500/30',
    [TaskStatus.SUSPICIOUS]: 'bg-red-500/20 text-red-400 border-red-500/30',
};

// Status icons
const statusIcons: Record<TaskStatus, React.ReactNode> = {
    [TaskStatus.PENDING]: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    [TaskStatus.IN_PROGRESS]: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
    ),
    [TaskStatus.COMPLETED]: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    [TaskStatus.SUSPICIOUS]: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    ),
};

export default function DashboardPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Fetch analytics data
    const { data: analyticsData } = useQuery({
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
        <MainLayout title="Dashboard" subtitle="Overview of delivery operations">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-400">Total Tasks</p>
                            <p className="text-2xl font-bold text-white">{loading ? '-' : stats.total}</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-slate-800 flex items-center justify-center">
                            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-yellow-400">Pending</p>
                            <p className="text-2xl font-bold text-white">{loading ? '-' : stats.pending}</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400">
                            {statusIcons[TaskStatus.PENDING]}
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-400">In Progress</p>
                            <p className="text-2xl font-bold text-white">{loading ? '-' : stats.inProgress}</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                            {statusIcons[TaskStatus.IN_PROGRESS]}
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-400">Completed</p>
                            <p className="text-2xl font-bold text-white">{loading ? '-' : stats.completed}</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                            {statusIcons[TaskStatus.COMPLETED]}
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-red-500/30 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-red-400">Suspicious</p>
                            <p className="text-2xl font-bold text-white">{loading ? '-' : stats.suspicious}</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                            {statusIcons[TaskStatus.SUSPICIOUS]}
                        </div>
                    </div>
                </div>
            </div>

            {/* Analytics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-purple-900/50 to-slate-900 border border-purple-500/30 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-purple-400">Teacher-Student Ratio</p>
                            <p className="text-3xl font-bold text-white">{analyticsData?.ratio || '-'}</p>
                            <p className="text-xs text-slate-400 mt-1">
                                {analyticsData ? `${analyticsData.totalTeachers} teachers : ${analyticsData.totalStudents} students` : 'Loading...'}
                            </p>
                        </div>
                        <div className="h-14 w-14 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-cyan-900/50 to-slate-900 border border-cyan-500/30 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-cyan-400">Total Teachers</p>
                            <p className="text-3xl font-bold text-white">{analyticsData?.totalTeachers?.toLocaleString() || '-'}</p>
                        </div>
                        <div className="h-14 w-14 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                            <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-amber-900/50 to-slate-900 border border-amber-500/30 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-amber-400">Total Students</p>
                            <p className="text-3xl font-bold text-white">{analyticsData?.totalStudents?.toLocaleString() || '-'}</p>
                        </div>
                        <div className="h-14 w-14 rounded-xl bg-amber-500/20 flex items-center justify-center">
                            <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Tasks */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl">
                <div className="flex items-center justify-between p-5 border-b border-slate-800">
                    <h2 className="text-lg font-semibold text-white">Recent Tasks</h2>
                    <Link
                        href="/tasks"
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        View All →
                    </Link>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500 mx-auto mb-3"></div>
                        <p className="text-slate-400">Loading tasks...</p>
                    </div>
                ) : error ? (
                    <div className="p-8 text-center">
                        <p className="text-red-400">{error}</p>
                    </div>
                ) : recentTasks.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-slate-400">No tasks found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800">
                        {recentTasks.map((task) => (
                            <Link
                                key={task.id}
                                href={`/tasks/${task.id}`}
                                className="flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{task.sealed_pack_code}</p>
                                        <p className="text-sm text-slate-400">
                                            {task.source_location} → {task.destination_location}
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[task.status]}`}>
                                    {task.status}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
