'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, School, BookOpen, Plus, Pencil, Trash2, Search,
  RefreshCw, AlertTriangle, X, Check, Loader2, ChevronDown
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { showSuccessToast, showErrorToast } from '@/components/ui/custom-toast';
import { TableSkeleton } from '@/components/TableSkeleton';
import {
  useGetDistricts, useGetSchoolsInfinite,
  useGetSubjectsDetailed,
  useCreateSchool, useUpdateSchool, useDeleteSchool,
  useCreateSubjectBulk, useUpdateSubject, useDeleteSubject
} from '@/services/user.service';
import { useDebounceCallback } from 'usehooks-ts';
import {
  createSchoolSchema, createSubjectSchema,
  editSchoolSchema, editSubjectSchema,
  type CreateSchoolFormValues, type CreateSubjectFormValues,
  type EditSchoolFormValues, type EditSubjectFormValues
} from '@/lib/zod';
import type { School as SchoolType, Subject, District } from '@/types';

// ========================================
// TABS
// ========================================

type Tab = 'schools' | 'subjects';
const CLASS_LEVELS = [8, 9, 10, 11, 12];

export default function ManagePage() {
  const [activeTab, setActiveTab] = useState<Tab>('schools');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Manage Schools & Subjects
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Add, edit, or remove schools and subjects
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('schools')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'schools'
            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
          <School className="w-4 h-4" />
          Schools
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'subjects'
            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
          <BookOpen className="w-4 h-4" />
          Subjects
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'schools' ? (
          <motion.div
            key="schools"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <SchoolsTab />
          </motion.div>
        ) : (
          <motion.div
            key="subjects"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <SubjectsTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ========================================
// SCHOOLS TAB
// ========================================

const SCHOOLS_PAGE_SIZE = 50;

function SchoolsTab() {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolType | null>(null);
  const [deleteSchool, setDeleteSchool] = useState<SchoolType | null>(null);

  const debouncedSetSearch = useDebounceCallback(setSearchQuery, 400);

  const { data: districts } = useGetDistricts();
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useGetSchoolsInfinite({
    pageSize: SCHOOLS_PAGE_SIZE,
    districtId: districtFilter !== 'all' ? districtFilter : undefined,
    search: searchQuery || undefined,
  });

  const allSchools = useMemo(() => {
    return data?.pages.flatMap(page => page.data) ?? [];
  }, [data]);

  const total = data?.pages[0]?.total ?? 0;

  const createMutation = useCreateSchool();
  const updateMutation = useUpdateSchool();
  const deleteMutation = useDeleteSchool();

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    debouncedSetSearch(val);
  };

  const handleDistrictChange = (val: string) => {
    setDistrictFilter(val);
  };

  const handleCreateSchool = async (values: CreateSchoolFormValues) => {
    try {
      await createMutation.mutateAsync(values);
      showSuccessToast('School created successfully');
      setIsCreateOpen(false);
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Failed to create school');
    }
  };

  const handleUpdateSchool = async (values: EditSchoolFormValues) => {
    if (!editingSchool) return;
    try {
      await updateMutation.mutateAsync({ id: editingSchool.id, data: values });
      showSuccessToast('School updated successfully');
      setEditingSchool(null);
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Failed to update school');
    }
  };

  const handleDeleteSchool = async () => {
    if (!deleteSchool) return;
    try {
      await deleteMutation.mutateAsync(deleteSchool.id);
      showSuccessToast('School deleted successfully');
      setDeleteSchool(null);
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Failed to delete school');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3 items-center flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search schools..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Select value={districtFilter} onValueChange={handleDistrictChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Districts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Districts</SelectItem>
              {districts?.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add School
          </Button>
        </motion.div>
      </div>

      {/* Stats */}
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{allSchools.length}</span> of{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-300">{total}</span> schools
      </p>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : allSchools.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <School className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-lg font-medium">No schools found</p>
          <p className="text-sm">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">School Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">NBSE Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">District</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allSchools.map((school, index) => (
                  <tr
                    key={school.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{school.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {school.registration_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{school.district?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingSchool(school)}
                          className="h-8 w-8 text-slate-400 hover:text-blue-600"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteSchool(school)}
                          className="h-8 w-8 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Load More Button */}
          {hasNextPage && (
            <div className="flex justify-center py-5 border-t border-slate-200 dark:border-slate-800">
              <motion.button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="group relative inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium
                  bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30
                  text-blue-700 dark:text-blue-300
                  border border-blue-200 dark:border-blue-800
                  hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/50 dark:hover:to-indigo-900/50
                  hover:border-blue-300 dark:hover:border-blue-700
                  hover:shadow-lg hover:shadow-blue-500/10
                  transition-all duration-300 ease-out
                  disabled:opacity-50"
              >
                {isFetchingNextPage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Load More'
                )}
                {!isFetchingNextPage && (
                  <motion.span
                    animate={{ y: [0, 3, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.span>
                )}
                <span className="text-xs text-blue-500 dark:text-blue-400">
                  ({total - allSchools.length} remaining)
                </span>
              </motion.button>
            </div>
          )}
        </div>
      )}

      {/* Create School Dialog */}
      <SchoolFormDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSchool}

        districts={districts ?? []}
        title="Add New School"
        description="Enter the school details below."
      />

      {/* Edit School Dialog */}
      <SchoolFormDialog
        open={!!editingSchool}
        onClose={() => setEditingSchool(null)}
        onSubmit={handleUpdateSchool}

        districts={districts ?? []}
        title="Edit School"
        description="Update the school details."
        defaultValues={editingSchool ? {
          name: editingSchool.name,
          registration_code: editingSchool.registration_code,
          district_id: editingSchool.district_id,
        } : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteSchool} onOpenChange={() => setDeleteSchool(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete School
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteSchool?.name}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteSchool(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSchool}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========================================
// SCHOOL FORM DIALOG
// ========================================

function SchoolFormDialog({
  open, onClose, onSubmit, districts, title, description, defaultValues
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: any) => Promise<void>;
  districts: District[];
  title: string;
  description: string;
  defaultValues?: Partial<CreateSchoolFormValues>;
}) {
  const form = useForm<CreateSchoolFormValues>({
    resolver: zodResolver(createSchoolSchema),
    defaultValues: defaultValues ?? { name: '', registration_code: '', district_id: '' },
  });

  // Reset form when default values change
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      onClose();
    }
  };

  // Reset form when dialog opens with new values
  const prevOpen = open;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Holy Cross Higher Secondary School" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="registration_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NBSE Registration Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="district_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>District</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {districts.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {defaultValues ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  defaultValues ? 'Update' : 'Create'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ========================================
// SUBJECTS TAB
// ========================================

function SubjectsTab() {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deleteSubjectState, setDeleteSubjectState] = useState<Subject | null>(null);

  const classLevel = classFilter !== 'all' ? parseInt(classFilter, 10) : undefined;
  const { data: subjects, isLoading, refetch } = useGetSubjectsDetailed(classLevel);

  const createMutation = useCreateSubjectBulk();
  const updateMutation = useUpdateSubject();
  const deleteMutation = useDeleteSubject();

  const filteredSubjects = subjects?.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const handleCreateSubject = async (values: CreateSubjectFormValues) => {
    try {
      const result = await createMutation.mutateAsync(values);
      if (result.errors.length > 0 && result.created.length === 0) {
        // All selected classes already exist — show a combined message
        const classNums = result.errors.map((e: string) => e.match(/class (\d+)/)?.[1]).filter(Boolean);
        showErrorToast(`Subject "${values.name}" already exists for class ${classNums.join(', ')}`);
      } else if (result.errors.length > 0) {
        // Partial success — some created, some already existed
        const classNums = result.errors.map((e: string) => e.match(/class (\d+)/)?.[1]).filter(Boolean);
        showErrorToast(`Already exists for class ${classNums.join(', ')}`);
      }
      if (result.created.length > 0) {
        showSuccessToast(`Created "${values.name}" for ${result.created.length} class(es)`);
      }
      setIsCreateOpen(false);
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Failed to create subject');
    }
  };

  const handleUpdateSubject = async (values: EditSubjectFormValues) => {
    if (!editingSubject) return;
    try {
      await updateMutation.mutateAsync({ id: editingSubject.id, data: values });
      showSuccessToast('Subject updated successfully');
      setEditingSubject(null);
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Failed to update subject');
    }
  };

  const handleDeleteSubject = async () => {
    if (!deleteSubjectState) return;
    try {
      await deleteMutation.mutateAsync(deleteSubjectState.id);
      showSuccessToast('Subject deleted successfully');
      setDeleteSubjectState(null);
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Failed to delete subject');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3 items-center flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {CLASS_LEVELS.map(c => (
                <SelectItem key={c} value={String(c)}>Class {c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Subject
        </Button>
      </div>

      {/* Stats */}
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Total: <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredSubjects.length}</span> subjects
      </p>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : filteredSubjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <BookOpen className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-lg font-medium">No subjects found</p>
          <p className="text-sm">Add a new subject to get started</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subject Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Class</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <AnimatePresence>
                  {filteredSubjects.map((subject, index) => (
                    <motion.tr
                      key={subject.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{subject.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          Class {subject.class_level}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${subject.is_active
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                          {subject.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingSubject(subject)}
                            className="h-8 w-8 text-slate-400 hover:text-blue-600"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteSubjectState(subject)}
                            className="h-8 w-8 text-slate-400 hover:text-red-600"
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
        </div>
      )}

      {/* Create Subject Dialog */}
      <SubjectCreateDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubject}

      />

      {/* Edit Subject Dialog */}
      <SubjectEditDialog
        open={!!editingSubject}
        onClose={() => setEditingSubject(null)}
        onSubmit={handleUpdateSubject}

        subject={editingSubject}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteSubjectState} onOpenChange={() => setDeleteSubjectState(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Subject
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteSubjectState?.name}</strong> (Class {deleteSubjectState?.class_level})?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteSubjectState(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSubject}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========================================
// SUBJECT CREATE DIALOG (with multi-class selection)
// ========================================

function SubjectCreateDialog({
  open, onClose, onSubmit
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CreateSubjectFormValues) => Promise<void>;
}) {
  const form = useForm<CreateSubjectFormValues>({
    resolver: zodResolver(createSubjectSchema),
    defaultValues: { name: '', class_levels: [] },
  });

  const selectedClassLevels = form.watch('class_levels');

  const toggleClassLevel = (level: number) => {
    const current = form.getValues('class_levels');
    if (current.includes(level)) {
      form.setValue('class_levels', current.filter(l => l !== level), { shouldValidate: true });
    } else {
      form.setValue('class_levels', [...current, level].sort(), { shouldValidate: true });
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Subject</DialogTitle>
          <DialogDescription>
            Enter the subject name and select which classes it applies to.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Mathematics" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="class_levels"
              render={() => (
                <FormItem>
                  <FormLabel>Class Levels</FormLabel>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {CLASS_LEVELS.map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => toggleClassLevel(level)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${selectedClassLevels.includes(level)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                          }`}
                      >
                        Class {level}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    Create
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ========================================
// SUBJECT EDIT DIALOG
// ========================================

function SubjectEditDialog({
  open, onClose, onSubmit, subject
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: EditSubjectFormValues) => Promise<void>;
  subject: Subject | null;
}) {


  const form = useForm<EditSubjectFormValues>({
    resolver: zodResolver(editSubjectSchema),
    defaultValues: {
      name: subject?.name ?? '',
      class_level: subject?.class_level ?? 10,
      is_active: subject?.is_active ?? true,
    },
  });

  // Reset when subject changes
  if (subject && form.getValues('name') !== subject.name) {
    form.reset({
      name: subject.name,
      class_level: subject.class_level,
      is_active: subject.is_active,
    });
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Subject</DialogTitle>
          <DialogDescription>Update the subject details.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="class_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class Level</FormLabel>
                  <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CLASS_LEVELS.map(c => (
                        <SelectItem key={c} value={String(c)}>Class {c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-3">
                    <FormLabel>Status</FormLabel>
                    <button
                      type="button"
                      onClick={() => field.onChange(!field.value)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${field.value ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${field.value ? 'translate-x-6' : 'translate-x-1'
                          }`}
                      />
                    </button>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {field.value ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...
                  </>
                ) : (
                  'Update'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
