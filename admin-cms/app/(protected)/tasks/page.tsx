'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tasksApi, usersApi, PaginatedTasksResponse } from '@/services/api';
import { Task, TaskStatus, User, UserRole } from '@/types';
import { createTaskSchema, CreateTaskSchema } from '@/lib/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { ClipboardList, Plus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshTableButton } from '@/components/RefreshTableButton';

// Status badge colors
const statusColors: Record<TaskStatus, string> = {
    [TaskStatus.PENDING]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    [TaskStatus.IN_PROGRESS]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    [TaskStatus.COMPLETED]: 'bg-green-500/20 text-green-400 border-green-500/30',
    [TaskStatus.SUSPICIOUS]: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const ITEMS_PER_PAGE = 10;

// Table Skeleton Component with more rows
function TableSkeleton() {
    return (
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
                    {[...Array(10)].map((_, i) => (
                        <motion.tr
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <td className="px-4 py-4"><Skeleton className="h-4 w-28" /></td>
                            <td className="px-4 py-4"><Skeleton className="h-4 w-36" /></td>
                            <td className="px-4 py-4"><Skeleton className="h-4 w-36" /></td>
                            <td className="px-4 py-4"><Skeleton className="h-4 w-28" /></td>
                            <td className="px-4 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                            <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                            <td className="px-4 py-4"><Skeleton className="h-4 w-14" /></td>
                        </motion.tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function TasksPage() {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
    const [page, setPage] = useState(1);

    // Create Task Dialog State
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Helper to get local datetime string for input
    const getLocalDateTimeString = (date: Date) => {
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - offset * 60 * 1000);
        return localDate.toISOString().slice(0, 16);
    };

    // Default start time: now, end time: now + 4 hours
    const getDefaultStartTime = () => getLocalDateTimeString(new Date());
    const getDefaultEndTime = () => {
        const endDate = new Date();
        endDate.setHours(endDate.getHours() + 4);
        return getLocalDateTimeString(endDate);
    };

    // Form setup with react-hook-form and zod
    const form = useForm<CreateTaskSchema>({
        resolver: zodResolver(createTaskSchema),
        defaultValues: {
            sealed_pack_code: '',
            source_location: '',
            destination_location: '',
            assigned_user_id: '',
            exam_type: 'REGULAR',
            start_time: getDefaultStartTime(),
            end_time: getDefaultEndTime(),
            geofence_radius: '100',
        },
    });

    // Create task mutation
    const createTaskMutation = useMutation({
        mutationFn: async (payload: any) => tasksApi.create(payload),
        onSuccess: () => {
            setCreateDialogOpen(false);
            form.reset({
                sealed_pack_code: '',
                source_location: '',
                destination_location: '',
                assigned_user_id: '',
                exam_type: 'REGULAR',
                start_time: getDefaultStartTime(),
                end_time: getDefaultEndTime(),
                geofence_radius: '100',
            });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Task created successfully!');
        },
        onError: (err: any) => {
            const message = err?.response?.data?.message;
            toast.error(Array.isArray(message) ? message[0] : message || 'Failed to create task');
        },
    });

    // Query for tasks with pagination and filtering
    const { data, isFetching, isLoading, error } = useQuery({
        queryKey: ['tasks', statusFilter, page],
        queryFn: () => tasksApi.getAll({
            status: statusFilter !== 'ALL' ? statusFilter : undefined,
            page,
            limit: ITEMS_PER_PAGE,
        }),
        placeholderData: (previousData) => previousData,
    });

    const tasks = data?.data ?? [];
    const total = data?.total ?? 0;
    const totalPages = data?.totalPages ?? 1;

    // Prefetch next page
    useEffect(() => {
        if (page < totalPages) {
            queryClient.prefetchQuery({
                queryKey: ['tasks', statusFilter, page + 1],
                queryFn: () => tasksApi.getAll({
                    status: statusFilter !== 'ALL' ? statusFilter : undefined,
                    page: page + 1,
                    limit: ITEMS_PER_PAGE,
                }),
            });
        }
    }, [page, totalPages, statusFilter, queryClient]);

    // Prefetch adjacent status filters
    useEffect(() => {
        const statuses: (TaskStatus | 'ALL')[] = ['ALL', ...Object.values(TaskStatus)];
        statuses.forEach((status) => {
            if (status !== statusFilter) {
                queryClient.prefetchQuery({
                    queryKey: ['tasks', status, 1],
                    queryFn: () => tasksApi.getAll({
                        status: status !== 'ALL' ? status : undefined,
                        page: 1,
                        limit: ITEMS_PER_PAGE,
                    }),
                });
            }
        });
    }, [statusFilter, queryClient]);

    // Reset page when filter changes
    const handleFilterChange = (newFilter: TaskStatus | 'ALL') => {
        setStatusFilter(newFilter);
        setPage(1);
    };

    // Load delivery users when dialog opens
    useEffect(() => {
        if (createDialogOpen && users.length === 0) {
            const fetchUsers = async () => {
                setLoadingUsers(true);
                try {
                    const response = await usersApi.getAll({
                        role: UserRole.SEBA_OFFICER,
                        is_active: true,
                        limit: 100,
                    });
                    setUsers(response.data);
                } catch {
                    toast.error('Failed to load users');
                } finally {
                    setLoadingUsers(false);
                }
            };
            fetchUsers();
        }
    }, [createDialogOpen, users.length]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleCreateTask = async (values: CreateTaskSchema) => {
        const payload = {
            ...values,
            start_time: new Date(values.start_time).toISOString(),
            end_time: new Date(values.end_time).toISOString(),
            geofence_radius: values.geofence_radius ? parseInt(values.geofence_radius, 10) : 100,
        };
        createTaskMutation.mutate(payload);
    };

    const getMinDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                        <ClipboardList className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tasks</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Manage delivery tasks</p>
                    </div>
                </div>

                {/* Create Task Button */}
                <Button
                    onClick={() => setCreateDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer gap-2 px-5 py-2.5 shadow-md hover:shadow-lg transition-all duration-300 group"
                >
                    <Plus className="h-4 w-4 group-hover:rotate-90 group-hover:scale-110 transition-transform duration-300" />
                    <span className="font-medium">Create Task</span>
                </Button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex gap-2 flex-wrap">
                    {['ALL', ...Object.values(TaskStatus)].map((status) => (
                        <motion.button
                            key={status}
                            onClick={() => handleFilterChange(status as TaskStatus | 'ALL')}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === status
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                        >
                            {status.replace('_', ' ')}
                        </motion.button>
                    ))}
                </div>
                <RefreshTableButton
                    queryKey={['tasks', statusFilter, page]}
                    isFetching={isFetching}
                />
            </div>

            {/* Tasks Table */}
            <motion.div
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {isLoading ? (
                    <TableSkeleton />
                ) : error ? (
                    <div className="p-8 text-center">
                        <p className="text-red-500 dark:text-red-400">Failed to load tasks</p>
                    </div>
                ) : tasks.length === 0 ? (
                    <motion.div
                        className="p-12 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                            <ClipboardList className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">No tasks found</p>
                        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Create a new task to get started</p>
                    </motion.div>
                ) : (
                    <div className={`relative transition-opacity duration-200 ${isFetching ? 'opacity-50' : ''}`}>
                        {isFetching && (
                            <motion.div
                                className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 z-10"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            </motion.div>
                        )}
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
                                    <AnimatePresence mode="popLayout">
                                        {tasks.map((task, index) => (
                                            <motion.tr
                                                key={task.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ delay: index * 0.03 }}
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
                                                        {task.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(task.created_at)}</span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <Link
                                                        href={`/tasks/${task.id}`}
                                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-sm font-medium hover:underline"
                                                    >
                                                        View →
                                                    </Link>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Pagination */}
            {!isLoading && !error && total > 0 && (
                <motion.div
                    className="flex items-center justify-between"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                        Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, total)} of {total} tasks
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || isFetching}
                            className="gap-1 shrink-0"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] md:max-w-[400px] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent py-1">
                            {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (page <= 3) {
                                    pageNum = i + 1;
                                } else if (page >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = page - 2 + i;
                                }
                                return (
                                    <Button
                                        key={pageNum}
                                        variant={page === pageNum ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setPage(pageNum)}
                                        disabled={isFetching}
                                        className="min-w-9 shrink-0"
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || isFetching}
                            className="gap-1 shrink-0"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Create Task Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                            <Plus className="h-5 w-5 text-blue-500" />
                            Create New Task
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 dark:text-slate-400">
                            Assign a new delivery task to a SEBA Officer
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleCreateTask)} className="space-y-4 mt-4">
                            {/* Sealed Pack Code */}
                            <FormField
                                control={form.control}
                                name="sealed_pack_code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sealed Pack Code *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., PACK-2026-001"
                                                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Source Location */}
                            <FormField
                                control={form.control}
                                name="source_location"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Source Location (Pickup) *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter pickup address..."
                                                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Destination Location */}
                            <FormField
                                control={form.control}
                                name="destination_location"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Destination Location (Delivery) *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter delivery address..."
                                                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Assigned User */}
                            <FormField
                                control={form.control}
                                name="assigned_user_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Assign to SEBA Officer *</FormLabel>
                                        {loadingUsers ? (
                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 py-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Loading users...
                                            </div>
                                        ) : users.length === 0 ? (
                                            <p className="text-yellow-600 dark:text-yellow-400 text-sm py-2">
                                                No active SEBA Officers found
                                            </p>
                                        ) : (
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                                        <SelectValue placeholder="Select a SEBA Officer" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                                    {users.map((user) => (
                                                        <SelectItem key={user.id} value={user.id}>
                                                            {user.name} ({user.phone})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Exam Type */}
                            <FormField
                                control={form.control}
                                name="exam_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Exam Type *</FormLabel>
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                                <SelectItem value="REGULAR">Regular Exam</SelectItem>
                                                <SelectItem value="COMPARTMENTAL">Compartmental Exam</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Time Window */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="start_time"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Start Time *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="datetime-local"
                                                    min={getMinDateTime()}
                                                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="end_time"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>End Time *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="datetime-local"
                                                    min={form.watch('start_time') || getMinDateTime()}
                                                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Geo-fence Radius */}
                            <FormField
                                control={form.control}
                                name="geofence_radius"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Geo-fence Radius (meters)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min="10"
                                                max="1000"
                                                placeholder="100"
                                                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 w-32"
                                                {...field}
                                            />
                                        </FormControl>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Default: 100m</p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCreateDialogOpen(false)}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createTaskMutation.isPending || loadingUsers || users.length === 0}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                                >
                                    {createTaskMutation.isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Task'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
