'use client';

import { useState, useMemo, useEffect } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounceCallback } from 'usehooks-ts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { School, Loader2, Search } from 'lucide-react';
import { paperSetterApi } from '@/services/paper-setter.service';
import { masterDataApi } from '@/services/api';
import { TableSkeleton } from '@/components/TableSkeleton';
import { RetryButton } from '@/components/RetryButton';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import { DeleteSchoolRecordButton } from '@/components/DeleteSchoolRecordButton';

const ITEMS_PER_PAGE = 10;

export default function SchoolWiseRecordsPage() {
  const queryClient = useQueryClient();
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'INVITED' | 'ACCEPTED'>('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce search input using usehooks-ts
  const debouncedSetSearch = useDebounceCallback(setSearchQuery, 500);

  // Fetch districts
  const { data: districts = [] } = useQuery({
    queryKey: ['districts'],
    queryFn: masterDataApi.getDistricts,
  });

  // Fetch subjects from API
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: masterDataApi.getSubjects,
  });

  // Fetch school-wise data with infinite query
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    error,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['school-wise-paper-setters', subjectFilter, statusFilter, districtFilter, searchQuery],
    queryFn: ({ pageParam = 1 }) => paperSetterApi.getSchoolWiseSelections({
      subject: subjectFilter !== 'all' ? subjectFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      districtId: districtFilter !== 'all' ? districtFilter : undefined,
      search: searchQuery || undefined,
      page: pageParam,
      limit: ITEMS_PER_PAGE,
    }),
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    maxPages: 5,
  });

  // Prefetch on hover handlers for select filters
  const handleDistrictHover = (districtId: string) => {
    if (districtId === districtFilter) return;
    queryClient.prefetchInfiniteQuery({
      queryKey: ['school-wise-paper-setters', subjectFilter, statusFilter, districtId, searchQuery],
      queryFn: ({ pageParam = 1 }) => paperSetterApi.getSchoolWiseSelections({
        subject: subjectFilter !== 'all' ? subjectFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        districtId: districtId !== 'all' ? districtId : undefined,
        search: searchQuery || undefined,
        page: pageParam,
        limit: ITEMS_PER_PAGE,
      }),
      initialPageParam: 1,
    });
  };

  const handleSubjectHover = (subject: string) => {
    if (subject === subjectFilter) return;
    queryClient.prefetchInfiniteQuery({
      queryKey: ['school-wise-paper-setters', subject, statusFilter, districtFilter, searchQuery],
      queryFn: ({ pageParam = 1 }) => paperSetterApi.getSchoolWiseSelections({
        subject: subject !== 'all' ? subject : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        districtId: districtFilter !== 'all' ? districtFilter : undefined,
        search: searchQuery || undefined,
        page: pageParam,
        limit: ITEMS_PER_PAGE,
      }),
      initialPageParam: 1,
    });
  };

  // Will it refetch again if I hover again or not because its cached ?
  // Check using -> REACT QUERY DEV TOOLS

  const handleStatusHover = (status: string) => {
    if (status === statusFilter) return;
    queryClient.prefetchInfiniteQuery({
      queryKey: ['school-wise-paper-setters', subjectFilter, status, districtFilter, searchQuery],
      queryFn: ({ pageParam = 1 }) => paperSetterApi.getSchoolWiseSelections({
        subject: subjectFilter !== 'all' ? subjectFilter : undefined,
        status: status !== 'all' ? status as 'INVITED' | 'ACCEPTED' : undefined,
        districtId: districtFilter !== 'all' ? districtFilter : undefined,
        search: searchQuery || undefined,
        page: pageParam,
        limit: ITEMS_PER_PAGE,
      }),
      initialPageParam: 1,
    });
  };

  // Flatten all pages into a single array
  const allRecords = useMemo(() => {
    return data?.pages.flatMap(page => page.data) || [];
  }, [data]);

  const totalRecords = data?.pages[0]?.total || 0;

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <RetryButton
          queryKey={['school-wise-paper-setters']}
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
          <School className="h-7 w-7 text-blue-500 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">School-Wise Paper Checkers</h1>
        </div>
        <RefreshTableButton
          queryKey={['school-wise-paper-setters', subjectFilter, statusFilter, districtFilter, searchQuery]}
          isFetching={isFetching && !isFetchingNextPage}
        />
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
                placeholder="Search by school or district..."
                defaultValue={searchQuery}
                onChange={(e) => debouncedSetSearch(e.target.value)}
                className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">District</label>
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <SelectValue placeholder="All Districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" onMouseEnter={() => handleDistrictHover('all')}>All Districts</SelectItem>
                {districts.map((d) => (
                  <SelectItem key={d.id} value={d.id} onMouseEnter={() => handleDistrictHover(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">Subject</label>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" onMouseEnter={() => handleSubjectHover('all')}>All Subjects</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s} value={s} onMouseEnter={() => handleSubjectHover(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">Status</label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'INVITED' | 'ACCEPTED')}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" onMouseEnter={() => handleStatusHover('all')}>All Status</SelectItem>
                <SelectItem value="INVITED" onMouseEnter={() => handleStatusHover('INVITED')}>Pending</SelectItem>
                <SelectItem value="ACCEPTED" onMouseEnter={() => handleStatusHover('ACCEPTED')}>Accepted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading State with Skeleton */}
        {(isLoading || (isFetching && !isFetchingNextPage)) ? (
          <TableSkeleton rows={15} columns={7} />
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">School Name</th>
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">District</th>
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Total Submissions</th>
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Accepted</th>
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Pending</th>
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Subjects</th>
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <School className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <div className="text-slate-500 dark:text-slate-400">
                          {searchQuery ? 'No schools match your search' : 'No records found'}
                        </div>
                        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Try adjusting your filters</p>
                      </td>
                    </tr>
                  ) : (
                    allRecords.map((record) => (
                      <tr key={record.schoolId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-4 px-4 text-blue-600 dark:text-blue-400 font-medium">{record.schoolName}</td>
                        <td className="py-4 px-4 text-blue-600 dark:text-blue-400">{record.district}</td>
                        <td className="py-4 px-4 text-slate-700 dark:text-slate-300">{record.totalSubmissions}</td>
                        <td className="py-4 px-4 text-green-600 dark:text-green-400">{record.accepted}</td>
                        <td className="py-4 px-4 text-orange-600 dark:text-orange-400">{record.pending}</td>
                        <td className="py-4 px-4 text-blue-600 dark:text-blue-400">{record.subjects}</td>
                        <td className="py-4 px-4">
                          <DeleteSchoolRecordButton
                            schoolId={record.schoolId}
                            schoolName={record.schoolName}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Load More */}
            {hasNextPage && (
              <div className="flex justify-center mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    `Load More (${totalRecords - allRecords.length} remaining)`
                  )}
                </Button>
              </div>
            )}

            {/* Summary */}
            {totalRecords > 0 && (
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-4 text-center">
                Showing {allRecords.length} of {totalRecords} schools
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
