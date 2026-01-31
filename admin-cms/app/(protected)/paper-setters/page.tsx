'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Trash2, FileText, Loader2, AlertTriangle, Users, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { paperSetterApi, PaperSetterSelection } from '@/services/paper-setter.service';
import { masterDataApi } from '@/services/api';
import { toast } from 'sonner';
import { RetryButton } from '@/components/RetryButton';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import { TableSkeleton } from '@/components/TableSkeleton';
import { ExpandableText } from '@/components/ExpandableText';
import { DeleteSchoolRecordButton } from '@/components/DeleteSchoolRecordButton';

const classLevels = ['10', '12'];

export default function PaperSettersPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<'all' | 'PAPER_SETTER' | 'EXAMINER'>('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'INVITED' | 'ACCEPTED'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const prevPageRef = useRef(1);
  const limit = 10;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Track if this is a sequential page change (next/prev) vs a jump
  const isSequentialNavigation = Math.abs(page - prevPageRef.current) === 1;

  // Update prevPageRef after render
  useEffect(() => {
    prevPageRef.current = page;
  }, [page]);

  // Fetch subjects from API
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: masterDataApi.getSubjects,
  });

  // Fetch all selections with pagination
  // Only use placeholderData for sequential navigation (next/prev page)
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['paper-setter-selections', typeFilter, subjectFilter, statusFilter, debouncedSearch, page, limit],
    queryFn: () => paperSetterApi.getAllSelections({
      subject: subjectFilter !== 'all' ? subjectFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      selectionType: typeFilter !== 'all' ? typeFilter : undefined,
      search: debouncedSearch || undefined,
      page,
      limit,
    }),
    placeholderData: isSequentialNavigation ? (previousData) => previousData : undefined,
  });

  const selections = data?.data || [];
  const totalPages = data?.totalPages || 0;
  const total = data?.total || 0;

  // Prefetch ONLY the next page for instant pagination
  useEffect(() => {
    if (page < totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['paper-setter-selections', typeFilter, subjectFilter, statusFilter, debouncedSearch, page + 1, limit],
        queryFn: () => paperSetterApi.getAllSelections({
          subject: subjectFilter !== 'all' ? subjectFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          selectionType: typeFilter !== 'all' ? typeFilter : undefined,
          search: debouncedSearch || undefined,
          page: page + 1,
          limit,
        }),
      });
    }
  }, [page, totalPages, typeFilter, subjectFilter, statusFilter, debouncedSearch, queryClient, limit]);

  // No client-side filtering needed now - all done server-side
  const filteredSelections = selections;

  const getStatusBadge = (status: string) => {
    if (status === 'ACCEPTED') {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500">Accepted</Badge>;
    }
    return <Badge variant="outline" className="text-orange-400 border-orange-400">Pending</Badge>;
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <RetryButton 
          queryKey={['paper-setter-selections']} 
          message="Failed to load data" 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-blue-500 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Paper Setters & Examiners</h1>
        </div>
        <div className="flex items-center gap-3">
          <RefreshTableButton queryKey={['paper-setter-selections', typeFilter, subjectFilter, statusFilter, debouncedSearch, page, limit]} isFetching={isFetching} />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-wrap gap-4 items-end mb-6">
          {/* Search Input */}
          <div className="flex-[2] min-w-[200px]">
            <label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or school..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">Type</label>
            <Select value={typeFilter} onValueChange={(v) => {
              setTypeFilter(v as 'all' | 'PAPER_SETTER' | 'EXAMINER');
              setPage(1);
            }}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="PAPER_SETTER">Paper Setters</SelectItem>
                <SelectItem value="EXAMINER">Examiners</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">Subject</label>
            <Select value={subjectFilter} onValueChange={(v) => {
              setSubjectFilter(v);
              setPage(1);
            }}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">Status</label>
            <Select value={statusFilter} onValueChange={(v) => {
              setStatusFilter(v as 'all' | 'INVITED' | 'ACCEPTED');
              setPage(1);
            }}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="INVITED">Pending</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading State with Skeleton - show when initial load OR when jumping pages (non-sequential) */}
        {isLoading || (isFetching && !isSequentialNavigation) ? (
          <TableSkeleton rows={5} columns={7} />
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Full Name</th>
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Subject</th>
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Message</th>
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">School</th>
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Remarks / Bank Details</th>
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSelections.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">
                        No selections found
                      </td>
                    </tr>
                  ) : (
                    filteredSelections.map((selection) => (
                      <tr key={selection.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-4 px-4 text-slate-700 dark:text-slate-300">
                          {selection.teacher?.name || 'N/A'}
                          <div className="text-xs text-slate-500">
                            {selection.selection_type === 'PAPER_SETTER' ? 'Paper Setter' : 'Examiner'} • Class {selection.class_level}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-700 dark:text-slate-300">{selection.subject}</td>
                        <td className="py-4 px-4 text-slate-600 dark:text-slate-400 max-w-xs">
                          {selection.invitation_message ? (
                            <ExpandableText text={selection.invitation_message} maxLength={50} />
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 italic">No message</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                          {selection.teacher?.school?.name || 'N/A'}
                          {selection.teacher?.school?.district && (
                            <div className="text-xs text-slate-500">{selection.teacher.school.district.name}</div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-600 dark:text-slate-400 text-sm">
                          {selection.status === 'ACCEPTED' ? (
                            <span className="text-green-600 dark:text-green-400">Bank details submitted</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">Awaiting acceptance</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {getStatusBadge(selection.status)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {selection.official_order_url && (
                              <a 
                                href={selection.official_order_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                                title="View Official Order"
                              >
                                <FileText className="h-5 w-5" />
                              </a>
                            )}
                            {selection.status === 'INVITED' && (
                             <DeleteSchoolRecordButton schoolId={selection.teacher?.school?.id || ''} schoolName={selection.teacher?.school?.name || ''} />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1 || isFetching}
                    className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Prev
                  </Button>
                  <div className="flex items-center gap-1 max-w-[200px] overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <Button
                        key={pageNum}
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        disabled={isFetching}
                        className={`w-8 h-8 p-0 flex-shrink-0 ${
                          page === pageNum
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {pageNum}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages || isFetching}
                    className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
