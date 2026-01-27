'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { tasksApi } from '@/services/api';
import { Task, TaskStatus } from '@/types';

// Status badge colors
const statusColors: Record<TaskStatus, string> = {
    [TaskStatus.PENDING]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    [TaskStatus.IN_PROGRESS]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    [TaskStatus.COMPLETED]: 'bg-green-500/20 text-green-400 border-green-500/30',
    [TaskStatus.SUSPICIOUS]: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<TaskStatus | 'ALL'>('ALL');

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

    // Filter tasks
    const filteredTasks = filter === 'ALL'
        ? tasks
        : tasks.filter(t => t.status === filter);

    // Sort by created_at (newest first)
    const sortedTasks = [...filteredTasks].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <MainLayout title="Tasks" subtitle="Manage delivery tasks">
            {/* Header with Create Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex gap-2 flex-wrap">
                    {['ALL', ...Object.values(TaskStatus)].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status as TaskStatus | 'ALL')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                        >
                            {status}
                            {status !== 'ALL' && (
                                <span className="ml-2 text-xs opacity-75">
                                    ({tasks.filter(t => t.status === status).length})
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                <Link
                    href="/tasks/create"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
                >
                    <span>+</span> Create Task
                </Link>
            </div>

            {/* Tasks Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mx-1">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-blue-500 mx-auto mb-3"></div>
                        <p className="text-slate-500 dark:text-slate-400">Loading tasks...</p>
                    </div>
                ) : error ? (
                    <div className="p-8 text-center">
                        <p className="text-red-500 dark:text-red-400">{error}</p>
                    </div>
                ) : sortedTasks.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-slate-500 dark:text-slate-400">No tasks found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">Pack Code</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">Source</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">Destination</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">Assigned To</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">Status</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">Created</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {sortedTasks.map((task) => (
                                    <tr
                                        key={task.id}
                                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${task.status === TaskStatus.SUSPICIOUS ? 'bg-red-50 dark:bg-red-500/5' : ''
                                            }`}
                                    >
                                        <td className="px-4 py-4">
                                            <span className="font-mono text-sm text-slate-900 dark:text-white">{task.sealed_pack_code}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-sm text-slate-700 dark:text-slate-300 line-clamp-1">{task.source_location}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-sm text-slate-700 dark:text-slate-300 line-clamp-1">{task.destination_location}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-sm text-slate-700 dark:text-slate-300">{task.assigned_user?.name || 'N/A'}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[task.status]}`}>
                                                {task.status === TaskStatus.SUSPICIOUS && (
                                                    <span className="mr-1">⚠️</span>
                                                )}
                                                {task.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(task.created_at)}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <Link
                                                href={`/tasks/${task.id}`}
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-sm font-medium"
                                            >
                                                View →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Task count */}
            {!loading && !error && (
                <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                    Showing {sortedTasks.length} of {tasks.length} tasks
                </div>
            )}
        </MainLayout>
    );
}
