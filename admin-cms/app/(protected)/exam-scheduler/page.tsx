'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examSchedulerApi, CreateExamSchedulePayload } from '@/services/exam-scheduler.service';
import { examCentersApi } from '@/services/exam-center.service';
import { ExamSchedule, ExamCenter } from '@/types';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, Plus, Loader2, Trash2, Pencil, Eye, Upload, X, Search, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showSuccessToast, showErrorToast } from '@/components/ui/custom-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import { ClearFiltersButton } from '@/components/ClearFiltersButton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    createExamScheduleSchema,
    editExamScheduleSchema,
    type CreateExamScheduleSchema,
    type EditExamScheduleSchema,
    EXAM_CLASSES,
    SUBJECT_CATEGORIES,
    SUBJECTS,
} from '@/lib/zod';
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from '@/components/ui/form';

// ============================
// SEARCHABLE EXAM CENTER SELECT
// ============================

function SearchableExamCenterSelect({
    value,
    onChange,
    examCenters,
}: {
    value: string;
    onChange: (value: string) => void;
    examCenters: ExamCenter[];
}) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    // Auto-focus search when opened
    useEffect(() => {
        if (open && inputRef.current) {
            inputRef.current.focus();
        }
    }, [open]);

    const filtered = searchQuery
        ? examCenters.filter((c) =>
            (c.school?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
        : examCenters;

    const selectedCenter = examCenters.find((c) => c.id === value);

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                role="combobox"
                aria-expanded={open}
                onClick={() => { setOpen(!open); setSearchQuery(''); }}
                className={cn(
                    'flex h-10 w-full items-center justify-between rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    !value && 'text-slate-500'
                )}
            >
                <span className="truncate">
                    {selectedCenter ? (selectedCenter.school?.name || 'Unknown School') : 'Select exam center'}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                    {/* Search input */}
                    <div className="flex items-center border-b border-slate-200 dark:border-slate-700 px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search school..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex h-9 w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-400 dark:text-white"
                        />
                    </div>

                    {/* Options */}
                    <div className="max-h-48 overflow-y-auto p-1">
                        {filtered.length === 0 ? (
                            <div className="py-4 text-center text-sm text-slate-400">
                                No exam centers found
                            </div>
                        ) : (
                            filtered.map((center) => (
                                <button
                                    key={center.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(center.id);
                                        setOpen(false);
                                        setSearchQuery('');
                                    }}
                                    className={cn(
                                        'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors',
                                        value === center.id
                                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    )}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            value === center.id ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                    <span className="truncate">{center.school?.name || 'Unknown School'}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================
// HELPERS
// ============================

function formatExamClass(cls: string): string {
    switch (cls) {
        case 'CLASS_10': return 'Class 10';
        case 'CLASS_12': return 'Class 12';
        default: return cls;
    }
}

function formatSubjectCategory(cat: string): string {
    switch (cat) {
        case 'CORE': return 'Core';
        case 'VOCATIONAL': return 'Vocational';
        default: return cat;
    }
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function getExamStatus(dateStr: string): { label: string; className: string } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(dateStr);
    examDate.setHours(0, 0, 0, 0);

    if (examDate.getTime() === today.getTime()) {
        return { label: 'Today', className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30' };
    } else if (examDate > today) {
        return { label: 'Upcoming', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
    } else {
        return { label: 'Completed', className: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30' };
    }
}

// ============================
// TABLE SKELETON
// ============================

function TableSkeleton() {
    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                        {['Date', 'Class', 'Subject', 'Subject Type', 'Exam Center', 'Timing', 'Status', 'Actions'].map((h) => (
                            <TableHead key={h} className="text-sm font-medium text-slate-600 dark:text-slate-400">{h}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(15)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

// ============================
// MAIN PAGE
// ============================

export default function ExamSchedulerPage() {
    const queryClient = useQueryClient();

    // Filters
    const [dateFilter, setDateFilter] = useState('');
    const [classFilter, setClassFilter] = useState<string>('');
    const [categoryFilter, setCategoryFilter] = useState<string>('');

    // Dialogs
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showViewDialog, setShowViewDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showBulkDialog, setShowBulkDialog] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<ExamSchedule | null>(null);

    // Bulk scheduling state
    const [bulkEntries, setBulkEntries] = useState<CreateExamScheduleSchema[]>([]);
    const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

    // Create form
    const createForm = useForm<CreateExamScheduleSchema>({
        resolver: zodResolver(createExamScheduleSchema),
        defaultValues: {
            exam_date: '',
            class: undefined,
            subject: undefined,
            subject_category: undefined,
            exam_center_id: '',
        },
    });

    // Edit form
    const editForm = useForm<EditExamScheduleSchema>({
        resolver: zodResolver(editExamScheduleSchema),
        defaultValues: {
            exam_date: '',
            class: undefined,
            subject: undefined,
            subject_category: undefined,
            exam_center_id: '',
            exam_start_time: '',
            exam_end_time: '',
        },
    });

    // Bulk add form (single entry to add into bulk list)
    const bulkForm = useForm<CreateExamScheduleSchema>({
        resolver: zodResolver(createExamScheduleSchema),
        defaultValues: {
            exam_date: '',
            class: undefined,
            subject: undefined,
            subject_category: undefined,
            exam_center_id: '',
        },
    });

    // ============================
    // QUERIES
    // ============================

    const { data: schedulesData, isLoading, isFetching } = useQuery({
        queryKey: ['exam-schedules', dateFilter, classFilter, categoryFilter],
        queryFn: () => examSchedulerApi.getAll({
            date: dateFilter || undefined,
            class: classFilter || undefined,
            category: categoryFilter || undefined,
        }),
    });

    const schedules = schedulesData?.data || [];

    // Fetch active exam centers for the exam center dropdown
    const { data: examCentersData } = useQuery({
        queryKey: ['exam-centers-active'],
        queryFn: () => examCentersApi.getAll({ is_active: true, limit: 500 }),
    });

    const activeExamCenters: ExamCenter[] = examCentersData?.data || [];

    // ============================
    // MUTATIONS
    // ============================

    const createMutation = useMutation({
        mutationFn: (data: CreateExamSchedulePayload) => examSchedulerApi.create(data),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['exam-schedules'] });
            showSuccessToast(res.message || 'Exam schedule created successfully');
            setShowCreateDialog(false);
            createForm.reset();
        },
        onError: (error: any) => {
            const msg = error?.response?.data?.message || 'Failed to create exam schedule';
            showErrorToast(msg);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CreateExamSchedulePayload> }) =>
            examSchedulerApi.update(id, data),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['exam-schedules'] });
            showSuccessToast(res.message || 'Exam schedule updated successfully');
            setShowEditDialog(false);
            editForm.reset();
            setSelectedSchedule(null);
        },
        onError: (error: any) => {
            const msg = error?.response?.data?.message || 'Failed to update exam schedule';
            showErrorToast(msg);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => examSchedulerApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exam-schedules'] });
            showSuccessToast('Exam schedule deleted successfully');
            setShowDeleteDialog(false);
            setSelectedSchedule(null);
        },
        onError: (error: any) => {
            const msg = error?.response?.data?.message || 'Failed to delete exam schedule';
            showErrorToast(msg);
        },
    });

    const bulkMutation = useMutation({
        mutationFn: (schedules: CreateExamSchedulePayload[]) => examSchedulerApi.createBulk(schedules),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['exam-schedules'] });
            showSuccessToast(res.message || `Created ${res.data.created} schedules, skipped ${res.data.skipped} duplicates`);
            setShowBulkDialog(false);
            setBulkEntries([]);
            setBulkProgress(null);
        },
        onError: (error: any) => {
            const msg = error?.response?.data?.message || 'Bulk scheduling failed';
            showErrorToast(msg);
            setBulkProgress(null);
        },
    });

    // ============================
    // HANDLERS
    // ============================

    const onCreateSubmit = (data: CreateExamScheduleSchema) => {
        createMutation.mutate({
            exam_date: data.exam_date,
            class: data.class,
            subject: data.subject,
            subject_category: data.subject_category,
            exam_center_id: data.exam_center_id,
        });
    };

    const onEditSubmit = (data: EditExamScheduleSchema) => {
        if (!selectedSchedule) return;
        updateMutation.mutate({
            id: selectedSchedule.id,
            data: {
                exam_date: data.exam_date,
                class: data.class,
                subject: data.subject,
                subject_category: data.subject_category,
                exam_center_id: data.exam_center_id,
                exam_start_time: data.exam_start_time,
                exam_end_time: data.exam_end_time,
            },
        });
    };

    const handleEditClick = (schedule: ExamSchedule) => {
        setSelectedSchedule(schedule);
        const examDate = new Date(schedule.exam_date).toISOString().split('T')[0];
        editForm.reset({
            exam_date: examDate,
            class: schedule.class as typeof EXAM_CLASSES[number],
            subject: schedule.subject as typeof SUBJECTS[number],
            subject_category: schedule.subject_category as typeof SUBJECT_CATEGORIES[number],
            exam_center_id: schedule.exam_center_id,
            exam_start_time: schedule.exam_start_time || '',
            exam_end_time: schedule.exam_end_time || '',
        });
        setShowEditDialog(true);
    };

    const handleAddBulkEntry = (data: CreateExamScheduleSchema) => {
        // Check for duplicate in current bulk list
        const isDuplicate = bulkEntries.some(
            (e) => e.exam_date === data.exam_date && e.class === data.class && e.subject === data.subject && e.exam_center_id === data.exam_center_id
        );
        if (isDuplicate) {
            showErrorToast('This exam is already in the bulk list');
            return;
        }
        setBulkEntries((prev) => [...prev, data]);
        bulkForm.reset({
            exam_date: data.exam_date,
            class: data.class,
            subject: data.subject,
            subject_category: data.subject_category,
            exam_center_id: data.exam_center_id,
        });
    };

    const handleRemoveBulkEntry = (index: number) => {
        setBulkEntries((prev) => prev.filter((_, i) => i !== index));
    };

    const handleBulkSubmit = () => {
        if (bulkEntries.length === 0) {
            showErrorToast('Add at least one exam to the bulk list');
            return;
        }
        setBulkProgress({ current: 0, total: bulkEntries.length });
        const payloads: CreateExamSchedulePayload[] = bulkEntries.map((e) => ({
            exam_date: e.exam_date,
            class: e.class,
            subject: e.subject,
            subject_category: e.subject_category,
            exam_center_id: e.exam_center_id,
        }));
        bulkMutation.mutate(payloads);
    };

    const clearFilters = () => {
        setDateFilter('');
        setClassFilter('');
        setCategoryFilter('');
    };

    const hasActiveFilters = dateFilter || classFilter || categoryFilter;

    // ============================
    // RENDER
    // ============================

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <CalendarClock className="w-7 h-7 text-blue-600" />
                        Exam Scheduler
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Schedule and manage exams for classes 10 and 12
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <RefreshTableButton queryKey={['exam-schedules']} />
                    <motion.div whileHover="hover" whileTap={{ scale: 0.97 }}>
                        <Button
                            onClick={() => { setShowBulkDialog(true); setBulkEntries([]); bulkForm.reset(); }}
                            className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/30 transition-all duration-300 border-0"
                        >
                            <motion.div variants={{ hover: { y: [0, -3, 0], transition: { repeat: Infinity, duration: 0.8 } } }}>
                                <Upload className="w-4 h-4" />
                            </motion.div>
                            Bulk Schedule
                        </Button>
                    </motion.div>
                    <motion.div whileHover="hover" whileTap={{ scale: 0.97 }}>
                        <Button
                            onClick={() => { setShowCreateDialog(true); createForm.reset(); }}
                            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 border-0"
                        >
                            <motion.div variants={{ hover: { rotate: 90, transition: { duration: 0.3 } } }}>
                                <Plus className="w-4 h-4" />
                            </motion.div>
                            Schedule Exam
                        </Button>
                    </motion.div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-44"
                    placeholder="Filter by date"
                />
                <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="CLASS_10">Class 10</SelectItem>
                        <SelectItem value="CLASS_12">Class 12</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="CORE">Core</SelectItem>
                        <SelectItem value="VOCATIONAL">Vocational</SelectItem>
                    </SelectContent>
                </Select>
                <ClearFiltersButton
                    hasActiveFilters={!!hasActiveFilters}
                    onClear={clearFilters}
                />
                {isFetching && !isLoading && (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500 ml-auto" />
                )}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                {isLoading ? (
                    <TableSkeleton />
                ) : schedules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                        <CalendarClock className="w-12 h-12 mb-3 text-blue-400/60" />
                        <p className="text-lg font-medium text-slate-700 dark:text-slate-300">No exams scheduled</p>
                        <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">Click &ldquo;Schedule Exam&rdquo; to create a new schedule</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-800/50 border-b border-blue-100 dark:border-slate-700">
                                    <TableHead className="text-blue-700 dark:text-blue-400 font-semibold">Date</TableHead>
                                    <TableHead className="text-blue-700 dark:text-blue-400 font-semibold">Class</TableHead>
                                    <TableHead className="text-blue-700 dark:text-blue-400 font-semibold">Subject</TableHead>
                                    <TableHead className="text-blue-700 dark:text-blue-400 font-semibold">Subject Type</TableHead>
                                    <TableHead className="text-blue-700 dark:text-blue-400 font-semibold">Exam Center</TableHead>
                                    <TableHead className="text-blue-700 dark:text-blue-400 font-semibold">Timing</TableHead>
                                    <TableHead className="text-blue-700 dark:text-blue-400 font-semibold">Status</TableHead>
                                    <TableHead className="text-blue-700 dark:text-blue-400 font-semibold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence>
                                    {schedules.map((schedule) => {
                                        const status = getExamStatus(schedule.exam_date);
                                        return (
                                            <motion.tr
                                                key={schedule.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="border-b border-slate-100 dark:border-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                            >
                                                <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                                                    {formatDate(schedule.exam_date)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={schedule.class === 'CLASS_10'
                                                        ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
                                                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                                    }>{formatExamClass(schedule.class)}</Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-700 dark:text-slate-300 font-medium">{schedule.subject}</TableCell>
                                                <TableCell>
                                                    <Badge className={schedule.subject_category === 'CORE'
                                                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                                    }>
                                                        {formatSubjectCategory(schedule.subject_category)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                                                    {schedule.exam_center?.school?.name || '—'}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
                                                        {schedule.exam_start_time} – {schedule.exam_end_time}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={status.className}>{status.label}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => { setSelectedSchedule(schedule); setShowViewDialog(true); }}
                                                            className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEditClick(schedule)}
                                                            className="h-8 w-8 p-0 text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => { setSelectedSchedule(schedule); setShowDeleteDialog(true); }}
                                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    </div>
                )}
                {/* Summary */}
                {!isLoading && schedules.length > 0 && (
                    <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/30 dark:to-slate-800/20 border-t border-blue-100 dark:border-slate-700 text-sm text-blue-700 dark:text-blue-400 font-medium">
                        Total: {schedules.length} exam{schedules.length !== 1 ? 's' : ''} scheduled
                    </div>
                )}
            </div>

            {/* ============================
                CREATE DIALOG
            ============================ */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarClock className="w-5 h-5 text-blue-600" />
                            Schedule New Exam
                        </DialogTitle>
                        <DialogDescription>
                            Fill in the details to schedule an exam. Duplicate date + class + subject combinations are not allowed.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...createForm}>
                        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                            <FormField
                                control={createForm.control}
                                name="exam_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Exam Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={createForm.control}
                                name="class"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Class</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select class" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="CLASS_10">Class 10</SelectItem>
                                                <SelectItem value="CLASS_12">Class 12</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={createForm.control}
                                name="subject"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Subject</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select subject" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {SUBJECTS.map((subj) => (
                                                    <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={createForm.control}
                                name="subject_category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Subject Type</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="CORE">Core</SelectItem>
                                                <SelectItem value="VOCATIONAL">Vocational</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={createForm.control}
                                name="exam_center_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Exam Center</FormLabel>
                                        <FormControl>
                                            <SearchableExamCenterSelect
                                                value={field.value}
                                                onChange={field.onChange}
                                                examCenters={activeExamCenters}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                                    {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                    Schedule
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* ============================
                EDIT DIALOG
            ============================ */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="w-5 h-5 text-amber-600" />
                            Edit Exam Schedule
                        </DialogTitle>
                        <DialogDescription>
                            Update the exam schedule details.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...editForm}>
                        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                            <FormField
                                control={editForm.control}
                                name="exam_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Exam Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="class"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Class</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select class" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="CLASS_10">Class 10</SelectItem>
                                                <SelectItem value="CLASS_12">Class 12</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="subject"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Subject</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select subject" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {SUBJECTS.map((subj) => (
                                                    <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="subject_category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Subject Type</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="CORE">Core</SelectItem>
                                                <SelectItem value="VOCATIONAL">Vocational</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="exam_center_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Exam Center</FormLabel>
                                        <FormControl>
                                            <SearchableExamCenterSelect
                                                value={field.value}
                                                onChange={field.onChange}
                                                examCenters={activeExamCenters}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={editForm.control}
                                    name="exam_start_time"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Start Time</FormLabel>
                                            <FormControl>
                                                <Input type="time" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={editForm.control}
                                    name="exam_end_time"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>End Time</FormLabel>
                                            <FormControl>
                                                <Input type="time" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={updateMutation.isPending} className="bg-amber-600 hover:bg-amber-700">
                                    {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                    Update
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* ============================
                VIEW DIALOG
            ============================ */}
            <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-500/10 rounded-lg">
                                <Eye className="w-5 h-5 text-blue-600" />
                            </div>
                            Exam Schedule Details
                        </DialogTitle>
                    </DialogHeader>
                    {selectedSchedule && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Date</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(selectedSchedule.exam_date)}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Class</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{formatExamClass(selectedSchedule.class)}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Subject</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedSchedule.subject}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Subject Type</p>
                                    <Badge className={selectedSchedule.subject_category === 'CORE'
                                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                    }>
                                        {formatSubjectCategory(selectedSchedule.subject_category)}
                                    </Badge>
                                </div>
                                <div className="col-span-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Exam Center</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedSchedule.exam_center?.school?.name || '—'}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Start Time</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedSchedule.exam_start_time || 'Default'}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">End Time</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedSchedule.exam_end_time || 'Default'}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Status</p>
                                    {(() => {
                                        const s = getExamStatus(selectedSchedule.exam_date);
                                        return <Badge className={s.className}>{s.label}</Badge>;
                                    })()}
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Active</p>
                                    <Badge className={selectedSchedule.is_active
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                        : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30'
                                    }>
                                        {selectedSchedule.is_active ? 'Yes' : 'No'}
                                    </Badge>
                                </div>
                            </div>
                            <div className="text-xs text-slate-400 pt-1">
                                Created: {new Date(selectedSchedule.created_at).toLocaleString('en-IN')}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ============================
                DELETE DIALOG
            ============================ */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <Trash2 className="w-5 h-5" />
                            Delete Exam Schedule
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this exam schedule? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedSchedule && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm">
                            <p><strong>{formatDate(selectedSchedule.exam_date)}</strong> — {formatExamClass(selectedSchedule.class)}</p>
                            <p>{selectedSchedule.subject} ({formatSubjectCategory(selectedSchedule.subject_category)})</p>
                        </div>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => selectedSchedule && deleteMutation.mutate(selectedSchedule.id)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ============================
                BULK SCHEDULING DIALOG
            ============================ */}
            <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Upload className="w-5 h-5 text-blue-600" />
                            Bulk Schedule Exams
                        </DialogTitle>
                        <DialogDescription>
                            Add multiple exam schedules at once. Build your list below and submit all at once.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Add entry form */}
                    <Form {...bulkForm}>
                        <form onSubmit={bulkForm.handleSubmit(handleAddBulkEntry)} className="space-y-3 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Add Exam Entry</p>
                            <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={bulkForm.control}
                                    name="exam_date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Date</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={bulkForm.control}
                                    name="class"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Class</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="CLASS_10">Class 10</SelectItem>
                                                    <SelectItem value="CLASS_12">Class 12</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={bulkForm.control}
                                    name="subject"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Subject</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select subject" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {SUBJECTS.map((subj) => (
                                                        <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={bulkForm.control}
                                    name="subject_category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Subject Type</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="CORE">Core</SelectItem>
                                                    <SelectItem value="VOCATIONAL">Vocational</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={bulkForm.control}
                                name="exam_center_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Exam Center</FormLabel>
                                        <FormControl>
                                            <SearchableExamCenterSelect
                                                value={field.value}
                                                onChange={field.onChange}
                                                examCenters={activeExamCenters}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end">
                                <Button type="submit" size="sm" variant="outline" className="gap-1">
                                    <Plus className="w-4 h-4" />
                                    Add to List
                                </Button>
                            </div>
                        </form>
                    </Form>

                    {/* Bulk entries list */}
                    {bulkEntries.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Entries to Schedule ({bulkEntries.length})
                            </p>
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                                            <TableHead className="text-xs">Date</TableHead>
                                            <TableHead className="text-xs">Class</TableHead>
                                            <TableHead className="text-xs">Subject</TableHead>
                                            <TableHead className="text-xs">Type</TableHead>
                                            <TableHead className="text-xs">Exam Center</TableHead>
                                            <TableHead className="text-xs w-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <AnimatePresence initial={false}>
                                            {bulkEntries.map((entry, idx) => (
                                                <motion.tr
                                                    key={`${entry.exam_date}-${entry.class}-${entry.subject}-${idx}`}
                                                    initial={{ opacity: 0, y: -10, height: 0 }}
                                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                    exit={{ opacity: 0, x: -20, height: 0 }}
                                                    transition={{ duration: 0.25, ease: 'easeOut' }}
                                                    className="border-b border-slate-100 dark:border-slate-800"
                                                >
                                                    <TableCell className="text-sm">{entry.exam_date}</TableCell>
                                                    <TableCell className="text-sm">{formatExamClass(entry.class)}</TableCell>
                                                    <TableCell className="text-sm">{entry.subject}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={entry.subject_category === 'CORE' ? 'default' : 'secondary'} className="text-xs">
                                                            {formatSubjectCategory(entry.subject_category)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                                                        {activeExamCenters.find((c) => c.id === entry.exam_center_id)?.school?.name || '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveBulkEntry(idx)}
                                                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    {/* Bulk progress */}
                    {bulkProgress && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
                            Processing {bulkProgress.total} entries...
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBulkSubmit}
                            disabled={bulkEntries.length === 0 || bulkMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700 gap-2"
                        >
                            {bulkMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Schedule {bulkEntries.length} Exam{bulkEntries.length !== 1 ? 's' : ''}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}
