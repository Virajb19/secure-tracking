'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { masterDataApi } from '@/services/api';
import { examCentersApi, PaginatedExamCentersResponse } from '@/services/exam-center.service';
import { ExamCenter, District, School } from '@/types';
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
import { School as SchoolIcon, Plus, Loader2, ChevronLeft, ChevronRight, UserCog, Trash2, Search, AlertTriangle, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import { AnimatedCheckbox } from '@/components/AnimatedCheckbox';

const ITEMS_PER_PAGE = 10;

function TableSkeleton() {
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                        {['School', 'District', 'Superintendent', 'Role', 'Status', 'Assigned By', 'Actions'].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[...Array(5)].map((_, i) => (
                        <tr key={i}>
                            <td className="px-4 py-4"><Skeleton className="h-4 w-40" /></td>
                            <td className="px-4 py-4"><Skeleton className="h-4 w-28" /></td>
                            <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                            <td className="px-4 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                            <td className="px-4 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                            <td className="px-4 py-4"><Skeleton className="h-4 w-28" /></td>
                            <td className="px-4 py-4"><Skeleton className="h-8 w-20" /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function ExamCentersPage() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [districtFilter, setDistrictFilter] = useState<string>('');

    // Dialogs
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showOverrideDialog, setShowOverrideDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedCenter, setSelectedCenter] = useState<ExamCenter | null>(null);

    // Create form state — multi-select
    const [selectedDistrictForCreate, setSelectedDistrictForCreate] = useState('');
    const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
    const [schoolSearchQuery, setSchoolSearchQuery] = useState('');

    // Override form state
    const [overrideEmail, setOverrideEmail] = useState('');

    // Track bulk creation progress
    const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

    // Fetch exam centers
    const { data: centersData, isLoading, isFetching } = useQuery({
        queryKey: ['exam-centers', page, search, districtFilter],
        queryFn: () => examCentersApi.getAll({
            page,
            limit: ITEMS_PER_PAGE,
            search: search || undefined,
            district_id: districtFilter || undefined,
        }),
    });

    // Fetch districts for filtering
    const { data: districts } = useQuery({
        queryKey: ['districts'],
        queryFn: () => masterDataApi.getDistricts(),
    });

    // Fetch schools for create dialog
    const { data: schoolsForCreate } = useQuery({
        queryKey: ['schools', selectedDistrictForCreate],
        queryFn: () => masterDataApi.getSchools(selectedDistrictForCreate || undefined),
        enabled: showCreateDialog,
    });

    // Create exam center mutation (single)
    const createMutation = useMutation({
        mutationFn: (schoolId: string) => examCentersApi.create(schoolId),
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create exam center');
        },
    });

    // Bulk create handler
    const handleBulkCreate = async () => {
        if (selectedSchoolIds.length === 0) return;

        const total = selectedSchoolIds.length;
        let successCount = 0;
        let failCount = 0;

        setBulkProgress({ current: 0, total });

        for (let i = 0; i < total; i++) {
            try {
                await examCentersApi.create(selectedSchoolIds[i]);
                successCount++;
            } catch (error: any) {
                failCount++;
                const msg = error.response?.data?.message || 'Failed';
                toast.error(`School ${i + 1}: ${msg}`);
            }
            setBulkProgress({ current: i + 1, total });
        }

        queryClient.invalidateQueries({ queryKey: ['exam-centers'] });
        setBulkProgress(null);

        if (successCount > 0) {
            toast.success(`${successCount} exam center${successCount > 1 ? 's' : ''} created successfully`);
        }
        if (failCount === 0) {
            setShowCreateDialog(false);
            setSelectedDistrictForCreate('');
            setSelectedSchoolIds([]);
            setSchoolSearchQuery('');
        }
    };

    // Override superintendent mutation
    const overrideMutation = useMutation({
        mutationFn: ({ examCenterId, email }: { examCenterId: string; email: string }) =>
            examCentersApi.overrideSuperintendent(examCenterId, email),
        onSuccess: (data) => {
            toast.success(data.message);
            queryClient.invalidateQueries({ queryKey: ['exam-centers'] });
            setShowOverrideDialog(false);
            setOverrideEmail('');
            setSelectedCenter(null);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to reassign superintendent');
        },
    });

    // Delete exam center mutation
    const deleteMutation = useMutation({
        mutationFn: (examCenterId: string) => examCentersApi.delete(examCenterId),
        onSuccess: () => {
            toast.success('Exam center deleted');
            queryClient.invalidateQueries({ queryKey: ['exam-centers'] });
            setShowDeleteDialog(false);
            setSelectedCenter(null);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete exam center');
        },
    });

    const centers = centersData?.data || [];
    const totalPages = centersData?.totalPages || 1;
    const total = centersData?.total || 0;

    // Toggle school selection
    const toggleSchool = (schoolId: string) => {
        setSelectedSchoolIds(prev =>
            prev.includes(schoolId)
                ? prev.filter(id => id !== schoolId)
                : [...prev, schoolId]
        );
    };

    // Select / deselect all visible schools
    const filteredSchools = schoolsForCreate
        ? (schoolSearchQuery
            ? schoolsForCreate.filter((s: School) => s.name?.toLowerCase().includes(schoolSearchQuery.toLowerCase()))
            : schoolsForCreate)
        : [];

    const allVisibleSelected = filteredSchools.length > 0 && filteredSchools.every((s: School) => selectedSchoolIds.includes(s.id));

    const toggleAllVisible = () => {
        if (allVisibleSelected) {
            setSelectedSchoolIds(prev => prev.filter(id => !filteredSchools.some((s: School) => s.id === id)));
        } else {
            const newIds = filteredSchools.map((s: School) => s.id).filter((id: string) => !selectedSchoolIds.includes(id));
            setSelectedSchoolIds(prev => [...prev, ...newIds]);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <motion.div
                            className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/25"
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <SchoolIcon className="w-6 h-6 text-white" />
                        </motion.div>
                        Exam Centers
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Manage exam center designations and Center Superintendent assignments.
                        When a school is selected, its headmaster auto-becomes CS. You can override with a different user.
                    </p>
                </div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button
                        onClick={() => setShowCreateDialog(true)}
                        className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 border-0 px-5 py-2.5 text-sm font-semibold group"
                    >
                        <motion.div
                            className="inline-flex"
                            whileHover={{ rotate: 90, scale: 1.2 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                        >
                            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 group-hover:scale-125 duration-300" />
                        </motion.div>
                        Add Exam Center
                    </Button>
                </motion.div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search by school or superintendent..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="pl-9"
                    />
                </div>
                <Select value={districtFilter} onValueChange={(v) => { setDistrictFilter(v === 'all' ? '' : v); setPage(1); }}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="All Districts" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Districts</SelectItem>
                        {districts?.map((d: District) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <RefreshTableButton queryKey={['exam-centers', page, search, districtFilter]} isFetching={isFetching} />
            </div>

            {/* Stats */}
            <div className="text-sm text-slate-500 dark:text-slate-400">
                Total: <span className="font-semibold text-slate-700 dark:text-slate-300">{total}</span> exam center{total !== 1 ? 's' : ''}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {isLoading ? (
                    <TableSkeleton />
                ) : centers.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                        <SchoolIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No exam centers found</p>
                        <p className="text-sm mt-1">Designate a school as an exam center to get started.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">School</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">District</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">Center Superintendent</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">Original Role</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">Status</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">Assigned By</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                <AnimatePresence>
                                    {centers.map((center, index) => (
                                        <motion.tr
                                            key={center.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                                        >
                                            <td className="px-4 py-4">
                                                <div>
                                                    <div className="font-medium text-slate-900 dark:text-white">{center.school?.name}</div>
                                                    <div className="text-xs text-slate-500">{center.school?.registration_code}</div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                {center.school?.district?.name || '—'}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div>
                                                    <div className="font-medium text-slate-900 dark:text-white">{center.superintendent?.name}</div>
                                                    <div className="text-xs text-slate-500">{center.superintendent?.email || center.superintendent?.phone}</div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                    {center.superintendent?.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${center.is_active
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                    }`}>
                                                    {center.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                {center.assigned_admin?.name || '—'}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedCenter(center);
                                                            setOverrideEmail('');
                                                            setShowOverrideDialog(true);
                                                        }}
                                                        className="gap-1 text-xs"
                                                    >
                                                        <UserCog className="w-3.5 h-3.5" />
                                                        Change CS
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedCenter(center);
                                                            setShowDeleteDialog(true);
                                                        }}
                                                        className="gap-1 text-xs"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* ===== CREATE EXAM CENTER DIALOG (Multi-Select) ===== */}
            <Dialog open={showCreateDialog} onOpenChange={(open) => {
                setShowCreateDialog(open);
                if (!open) {
                    setSelectedDistrictForCreate('');
                    setSelectedSchoolIds([]);
                    setSchoolSearchQuery('');
                    setBulkProgress(null);
                }
            }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                                <SchoolIcon className="w-4 h-4 text-white" />
                            </div>
                            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                Designate Exam Centers
                            </span>
                        </DialogTitle>
                        <DialogDescription>
                            Select one or more schools to designate as exam centers. The headmaster of each school will automatically become the Center Superintendent.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">District</label>
                            <Select
                                value={selectedDistrictForCreate}
                                onValueChange={(v) => {
                                    setSelectedDistrictForCreate(v);
                                    setSelectedSchoolIds([]);
                                    setSchoolSearchQuery('');
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select district" />
                                </SelectTrigger>
                                <SelectContent>
                                    {districts?.map((d: District) => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Schools</label>
                                {selectedSchoolIds.length > 0 && (
                                    <span className="text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                                        {selectedSchoolIds.length} selected
                                    </span>
                                )}
                            </div>

                            {/* School search */}
                            {selectedDistrictForCreate && (
                                <div className="relative mb-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search schools..."
                                        value={schoolSearchQuery}
                                        onChange={(e) => setSchoolSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                                    />
                                </div>
                            )}

                            {/* School list with checkboxes */}
                            <div className={`border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden ${!selectedDistrictForCreate ? 'bg-slate-50 dark:bg-slate-800/50' : ''
                                }`}>
                                {!selectedDistrictForCreate ? (
                                    <div className="py-8 text-center text-sm text-slate-400">
                                        Select a district first
                                    </div>
                                ) : (
                                    <>
                                        {/* Select all header */}
                                        {filteredSchools.length > 0 && (
                                            <div
                                                className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                                onClick={toggleAllVisible}
                                            >
                                                <AnimatedCheckbox
                                                    checked={allVisibleSelected}
                                                    onCheckedChange={toggleAllVisible}
                                                />
                                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                    Select all ({filteredSchools.length})
                                                </span>
                                            </div>
                                        )}
                                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredSchools.length === 0 ? (
                                                <div className="py-6 text-center text-sm text-slate-400">
                                                    No schools found
                                                </div>
                                            ) : (
                                                filteredSchools.map((s: School) => {
                                                    const isSelected = selectedSchoolIds.includes(s.id);
                                                    return (
                                                        <div
                                                            key={s.id}
                                                            className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors duration-150 ${isSelected
                                                                ? 'bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/30'
                                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                                }`}
                                                            onClick={() => toggleSchool(s.id)}
                                                        >
                                                            <AnimatedCheckbox
                                                                checked={isSelected}
                                                                onCheckedChange={() => toggleSchool(s.id)}
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <div className={`text-sm truncate ${isSelected ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                    {s.name?.trim()}
                                                                </div>
                                                                {s.registration_code && (
                                                                    <div className="text-xs text-slate-400">{s.registration_code}</div>
                                                                )}
                                                            </div>
                                                            {isSelected && (
                                                                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Selected schools pills */}
                        <AnimatePresence>
                            {selectedSchoolIds.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex flex-wrap gap-1.5"
                                >
                                    {selectedSchoolIds.map(id => {
                                        const school = schoolsForCreate?.find((s: School) => s.id === id);
                                        if (!school) return null;
                                        return (
                                            <motion.span
                                                key={id}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-md text-xs font-medium"
                                            >
                                                {school.name?.trim()?.substring(0, 25)}{(school.name?.length || 0) > 25 ? '…' : ''}
                                                <button
                                                    onClick={() => toggleSchool(id)}
                                                    className="hover:bg-emerald-200 dark:hover:bg-emerald-800/50 rounded-full p-0.5 transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </motion.span>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
                            <p className="font-medium">Auto-assignment:</p>
                            <p className="mt-1">The headmaster of each selected school will automatically be assigned as Center Superintendent and will see the &quot;Question Paper Tracking&quot; tab.</p>
                        </div>

                        {/* Bulk progress */}
                        {bulkProgress && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600 dark:text-slate-400">Creating exam centers...</span>
                                    <span className="font-medium text-emerald-600">{bulkProgress.current}/{bulkProgress.total}</span>
                                </div>
                                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={!!bulkProgress}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleBulkCreate}
                                disabled={selectedSchoolIds.length === 0 || !!bulkProgress}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 border-0"
                            >
                                {bulkProgress ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Plus className="w-4 h-4 mr-2" />
                                )}
                                Create {selectedSchoolIds.length > 1 ? `${selectedSchoolIds.length} Exam Centers` : 'Exam Center'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ===== OVERRIDE CS DIALOG ===== */}
            <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Change Center Superintendent</DialogTitle>
                        <DialogDescription>
                            Reassign the Center Superintendent for <span className="font-semibold">{selectedCenter?.school?.name}</span>.
                            The current CS ({selectedCenter?.superintendent?.name}) will lose access.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                                New Superintendent&apos;s Email
                            </label>
                            <Input
                                type="email"
                                placeholder="Enter the email of the new CS"
                                value={overrideEmail}
                                onChange={(e) => setOverrideEmail(e.target.value)}
                            />
                            <p className="text-xs text-slate-500 mt-1.5">
                                The user must be a registered Teacher or Headmaster.
                            </p>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-300 flex gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium">Warning:</p>
                                <p className="mt-1">The current superintendent ({selectedCenter?.superintendent?.name}) will immediately lose Center Superintendent access.</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => selectedCenter && overrideEmail && overrideMutation.mutate({
                                    examCenterId: selectedCenter.id,
                                    email: overrideEmail,
                                })}
                                disabled={!overrideEmail || overrideMutation.isPending}
                            >
                                {overrideMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                Reassign
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ===== DELETE DIALOG ===== */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Exam Center</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove <span className="font-semibold">{selectedCenter?.school?.name}</span> as an exam center?
                            The superintendent will lose their Center Superintendent access.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => selectedCenter && deleteMutation.mutate(selectedCenter.id)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
