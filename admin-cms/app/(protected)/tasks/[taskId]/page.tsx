'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { tasksApi } from '@/services/api';
import { Task, TaskEvent, TaskStatus, EventType } from '@/types';

// Status colors
const statusColors: Record<TaskStatus, string> = {
    [TaskStatus.PENDING]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    [TaskStatus.IN_PROGRESS]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    [TaskStatus.COMPLETED]: 'bg-green-500/20 text-green-400 border-green-500/30',
    [TaskStatus.SUSPICIOUS]: 'bg-red-500/20 text-red-400 border-red-500/30',
};

// Event type colors for 5-step workflow
const eventColors: Record<EventType, string> = {
    [EventType.PICKUP_POLICE_STATION]: 'bg-blue-500',
    [EventType.ARRIVAL_EXAM_CENTER]: 'bg-purple-500',
    [EventType.OPENING_SEAL]: 'bg-orange-500',
    [EventType.SEALING_ANSWER_SHEETS]: 'bg-teal-500',
    [EventType.SUBMISSION_POST_OFFICE]: 'bg-green-500',
};

// Event type labels for UI display
const eventLabels: Record<EventType, { title: string; icon: string }> = {
    [EventType.PICKUP_POLICE_STATION]: { title: 'Police Station Pickup', icon: '🚔' },
    [EventType.ARRIVAL_EXAM_CENTER]: { title: 'Exam Center Arrival', icon: '🏫' },
    [EventType.OPENING_SEAL]: { title: 'Opening Seal', icon: '📦' },
    [EventType.SEALING_ANSWER_SHEETS]: { title: 'Sealing Answer Sheets', icon: '✍️' },
    [EventType.SUBMISSION_POST_OFFICE]: { title: 'Post Office Submission', icon: '📮' },
};

// Event type order for timeline (5-step workflow)
const eventOrder: EventType[] = [
    EventType.PICKUP_POLICE_STATION,
    EventType.ARRIVAL_EXAM_CENTER,
    EventType.OPENING_SEAL,
    EventType.SEALING_ANSWER_SHEETS,
    EventType.SUBMISSION_POST_OFFICE
];

// Types for attendance record
interface AttendanceRecord {
    id: string;
    location_type: 'PICKUP' | 'DESTINATION';
    image_url: string;
    latitude: number;
    longitude: number;
    is_within_geofence: boolean;
    distance_from_target: string | null;
    timestamp: string;
}

export default function TaskDetailPage() {
    const params = useParams();
    const taskId = params.taskId as string;

    const [task, setTask] = useState<Task | null>(null);
    const [events, setEvents] = useState<TaskEvent[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchTaskData = async () => {
        try {
            const [taskData, eventsData] = await Promise.all([
                tasksApi.getById(taskId),
                tasksApi.getTaskEvents(taskId).catch(() => []),
            ]);
            setTask(taskData);
            setEvents(eventsData);

            // Fetch attendance records
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks/${taskId}/attendance`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setAttendance(data.attendance || []);
                }
            } catch (e) {
                console.log('Failed to fetch attendance:', e);
            }
        } catch {
            setError('Failed to load task details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTaskData();
    }, [taskId]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    // Get event by type
    const getEventByType = (type: EventType): TaskEvent | undefined => {
        return events.find(e => e.event_type === type);
    };

    if (loading) {
        return (
            <MainLayout title="Task Details" subtitle="Loading...">
                <div className="flex items-center justify-center h-64">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500"></div>
                </div>
            </MainLayout>
        );
    }

    if (error || !task) {
        return (
            <MainLayout title="Task Details" subtitle="Error">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
                    <p className="text-red-400">{error || 'Task not found'}</p>
                    <Link href="/tasks" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
                        ← Back to Tasks
                    </Link>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout title="Task Details" subtitle={task.sealed_pack_code}>
            {/* Back Button */}
            <Link
                href="/tasks"
                className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Tasks
            </Link>

            {/* Suspicious Alert */}
            {task.status === TaskStatus.SUSPICIOUS && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-semibold text-red-600 dark:text-red-400">⚠️ SUSPICIOUS ACTIVITY DETECTED</p>
                        <p className="text-sm text-red-500/80 dark:text-red-300/70">This task has been flagged due to time window violation. Review the event timeline carefully.</p>
                    </div>
                </div>
            )}

            {/* Attendance Records Section - Placed at top for easy admin visibility */}
            {attendance.length > 0 && (
                <div className="mb-6 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        📍 Officer Attendance
                        <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full">
                            {attendance.length} record{attendance.length > 1 ? 's' : ''}
                        </span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {attendance.map((record) => (
                            <div key={record.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                                {/* Header with location type */}
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-slate-900 dark:text-white font-medium flex items-center gap-2">
                                        {record.location_type === 'PICKUP' ? '📍' : '🎯'}
                                        {record.location_type === 'PICKUP' ? 'Pickup Location' : 'Destination'}
                                    </span>
                                    {/* Geo-fence badge */}
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.is_within_geofence
                                            ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30'
                                            : 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30'
                                        }`}>
                                        {record.is_within_geofence ? '✅ Within Area' : '⚠️ Outside Area'}
                                    </span>
                                </div>

                                {/* Timestamp */}
                                <div className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                                    🕐 {formatDate(record.timestamp)}
                                </div>

                                {/* Distance */}
                                {record.distance_from_target && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                        Distance from target: {record.distance_from_target}m
                                    </div>
                                )}

                                {/* Coordinates */}
                                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-3">
                                    <span>📍 {Number(record.latitude).toFixed(6)}, {Number(record.longitude).toFixed(6)}</span>
                                    <a
                                        href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-xs"
                                    >
                                        View on Map →
                                    </a>
                                </div>

                                {/* Photo */}
                                {record.image_url && (
                                    <a
                                        href={`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '')}${record.image_url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                    >
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '')}${record.image_url}`}
                                            alt="Officer attendance photo"
                                            className="w-full h-40 object-cover rounded-lg border border-slate-300 dark:border-slate-600 hover:border-emerald-500 transition-colors"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Task Info Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sticky top-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Task Information</h2>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Pack Code</p>
                                <p className="font-mono text-slate-900 dark:text-white">{task.sealed_pack_code}</p>
                            </div>

                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border mt-1 ${statusColors[task.status]}`}>
                                    {task.status}
                                </span>
                            </div>

                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Source Location</p>
                                <p className="text-slate-900 dark:text-white">{task.source_location}</p>
                            </div>

                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Destination</p>
                                <p className="text-slate-900 dark:text-white">{task.destination_location}</p>
                            </div>

                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Assigned To</p>
                                <p className="text-slate-900 dark:text-white">{task.assigned_user?.name || 'N/A'}</p>
                                <p className="text-xs text-slate-500">{task.assigned_user?.phone}</p>
                            </div>

                            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                <p className="text-sm text-slate-500 dark:text-slate-400">Time Window</p>
                                <div className="mt-2 space-y-1">
                                    <p className="text-sm">
                                        <span className="text-slate-500">Start:</span>{' '}
                                        <span className="text-slate-900 dark:text-white">{formatDate(task.start_time)}</span>
                                    </p>
                                    <p className="text-sm">
                                        <span className="text-slate-500">End:</span>{' '}
                                        <span className="text-slate-900 dark:text-white">{formatDate(task.end_time)}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                <p className="text-sm text-slate-500 dark:text-slate-400">Created At</p>
                                <p className="text-slate-900 dark:text-white">{formatDate(task.created_at)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Event Timeline */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Event Timeline</h2>

                        {events.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400">No events recorded yet</p>
                                <p className="text-sm text-slate-400 dark:text-slate-500">Events will appear here when the delivery agent uploads them</p>
                            </div>
                        ) : (
                            <div className="relative">
                                {/* Timeline Line */}
                                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-300 dark:bg-slate-700"></div>

                                {/* Timeline Events */}
                                <div className="space-y-8">
                                    {eventOrder.map((eventType, index) => {
                                        const event = getEventByType(eventType);
                                        const isCompleted = !!event;
                                        const label = eventLabels[eventType];

                                        return (
                                            <div key={eventType} className="relative flex gap-6">
                                                {/* Timeline Node */}
                                                <div className={`relative z-10 flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center ${isCompleted ? eventColors[eventType] : 'bg-slate-200 dark:bg-slate-700'
                                                    }`}>
                                                    {isCompleted ? (
                                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : (
                                                        <span className="text-2xl">{label.icon}</span>
                                                    )}
                                                </div>

                                                {/* Event Content */}
                                                <div className={`flex-1 pb-2 ${!isCompleted ? 'opacity-50' : ''}`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                            <span>{label.icon}</span>
                                                            <span>{label.title}</span>
                                                        </h3>
                                                        {event && (
                                                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                                                {formatDate(event.server_timestamp)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {event ? (
                                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                                                            {/* Timestamp Badge */}
                                                            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 mb-3">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                <span className="font-medium">Captured: {formatDate(event.server_timestamp)}</span>
                                                            </div>

                                                            {/* Location */}
                                                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 mb-3">
                                                                <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                </svg>
                                                                <span>
                                                                    📍 {Number(event.latitude).toFixed(6)}, {Number(event.longitude).toFixed(6)}
                                                                </span>
                                                                <a
                                                                    href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-xs ml-2"
                                                                >
                                                                    View on Map →
                                                                </a>
                                                            </div>

                                                            {/* Image */}
                                                            {event.image_url && (
                                                                <div className="mb-3">
                                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">📸 Evidence Photo:</p>
                                                                    <a
                                                                        href={`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '')}${event.image_url}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="block"
                                                                    >
                                                                        <img
                                                                            src={`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '')}${event.image_url}`}
                                                                            alt={`${label.title} evidence`}
                                                                            className="w-full max-w-md rounded-lg border border-slate-300 dark:border-slate-700 hover:border-blue-500 transition-colors cursor-pointer"
                                                                            onError={(e) => {
                                                                                const target = e.target as HTMLImageElement;
                                                                                target.style.display = 'none';
                                                                                target.parentElement!.innerHTML = '<p class="text-red-400 text-sm">Failed to load image</p>';
                                                                            }}
                                                                        />
                                                                    </a>
                                                                </div>
                                                            )}

                                                            {/* Image Hash */}
                                                            <div className="text-xs text-slate-600 dark:text-slate-500 font-mono break-all bg-slate-100 dark:bg-slate-900/50 p-2 rounded">
                                                                🔐 SHA-256: {event.image_hash}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-slate-100 dark:bg-slate-800/30 rounded-lg p-4 border border-dashed border-slate-300 dark:border-slate-700">
                                                            <p className="text-sm text-slate-500 flex items-center gap-2">
                                                                <span className="animate-pulse">⏳</span>
                                                                Pending - Waiting for NBSE Officer to submit
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
