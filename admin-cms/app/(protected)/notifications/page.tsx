'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Bell, Loader2, FileText, Calendar, Building2, Tag, Paperclip, MessageSquare, RefreshCw } from 'lucide-react';
import { DeleteNoticeButton } from '@/components/DeleteNoticeButton';
import { ViewNoticeButton } from '@/components/ViewNoticeButton';
import { ExpandableText } from '@/components/ExpandableText';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import noticesService, { type Notice, type NoticeType, noticeTypeLabels, NOTICES_QUERY_KEY } from '@/services/notices.service';
import { toast } from 'sonner';
import { useDebounceCallback } from 'usehooks-ts';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const tableRowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: 'easeOut' as const
    }
  }),
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.2 }
  },
  hover: {
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    transition: { duration: 0.2 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3 }
  }
};

const typeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'GENERAL', label: 'General' },
  { value: 'PAPER_SETTER', label: 'Paper Setter' },
  { value: 'PAPER_CHECKER', label: 'Paper Checker' },
  { value: 'INVITATION', label: 'Invitation' },
  { value: 'PUSH_NOTIFICATION', label: 'Push Notification' },
];


const typeStyles: Record<string, string> = {
  'GENERAL': 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  'PAPER_SETTER': 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
  'PAPER_CHECKER': 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
  'INVITATION': 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  'PUSH_NOTIFICATION': 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
};

export default function NotificationsPage() {
  const [selectedType, setSelectedType] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Debounce the search
  const debouncedSetSearch = useDebounceCallback(setSearchQuery, 500);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [allNotices, setAllNotices] = useState<Notice[]>([]);
  const [previousLength, setPreviousLength] = useState(0);
  const pageSize = 50;
  
  // Track previous filter to detect changes
  const prevTypeRef = useRef(selectedType);
  
  const queryClient = useQueryClient();
  
  // Build the type filter - only pass to API if not 'all'
  const typeFilter = selectedType === 'all' ? undefined : selectedType;
  
  // useQuery for fetching notices
  const { 
    data: noticesData, 
    isLoading, 
    isFetching,
    isError, 
    error 
  } = useQuery({
    queryKey: [NOTICES_QUERY_KEY, typeFilter, pageSize, page * pageSize],
    queryFn: () => noticesService.getAll({ type: typeFilter }, pageSize, page * pageSize),
  });

  // toast.success(JSON.stringify(noticesData));

  // Reset page when filter changes
  useEffect(() => {
    if (prevTypeRef.current !== selectedType) {
      setPage(0);
      // setAllNotices([]);
      // setPreviousLength(0);
      prevTypeRef.current = selectedType;
    }
  }, [selectedType]);

  // Update allNotices when data changes
  useEffect(() => {
    if (noticesData?.data) {
      if (page === 0) {
        setAllNotices(noticesData.data);
        setPreviousLength(0);
      } else {
        setPreviousLength(allNotices.length);
        setAllNotices(prev => {
          // Check if we already have this data (avoid duplicates)
          const existingIds = new Set(prev.map(n => n.id));
          const newNotices = noticesData.data.filter(n => !existingIds.has(n.id));
          return [...prev, ...newNotices];
        });
      }
    }
  }, [noticesData, page]);

  const hasMore = noticesData?.data?.length === pageSize;

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  // Filter notices based on search (client-side)
  const filteredNotices = useMemo(() => {
    return allNotices.filter((notice: Notice) => {
      const matchesSearch = searchQuery === '' || 
        notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notice.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (notice.school?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      return matchesSearch;
    });
  }, [allNotices, searchQuery]);

  // Stats
  const withFileCount = allNotices.filter((n: Notice) => n.file_url).length;
  const typeCounts = {
    general: allNotices.filter((n: Notice) => n.type === 'GENERAL').length,
    paperSetter: allNotices.filter((n: Notice) => n.type === 'PAPER_SETTER').length,
    invitation: allNotices.filter((n: Notice) => n.type === 'INVITATION').length,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading && allNotices.length === 0) {
    return (
      <motion.div 
        className="space-y-8 p-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notices</h1>
          </div>
        </motion.div>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="h-10 w-10 text-blue-500" />
          </motion.div>
          <span className="text-slate-500 dark:text-slate-400">Loading notices...</span>
        </div>
      </motion.div>
    );
  }

  if (isError && allNotices.length === 0) {
    return (
      <motion.div 
        className="space-y-8 p-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notices</h1>
          </div>
        </motion.div>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="flex flex-col items-center justify-center py-12 text-red-400">
            <Bell className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Failed to load notices</p>
            <p className="text-sm text-slate-500 mt-1">{(error as Error)?.message || 'Unknown error'}</p>
            <button
              className="mt-4 px-4 py-2 text-sm text-blue-400 border border-blue-400 rounded-lg hover:bg-blue-400/10"
              onClick={() => queryClient.invalidateQueries({ queryKey: [NOTICES_QUERY_KEY] })}
            >
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" /> Retry
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-8 p-2"
      variants={containerVariants}
      initial={false}
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bell className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notices</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">View and manage all system notices</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 px-3 py-1">
              {typeCounts.general} General
            </Badge>
            <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-3 py-1">
              {withFileCount} With Files
            </Badge>
            <Badge className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 px-3 py-1">
              {allNotices.length} Total
            </Badge>
            <RefreshTableButton queryKey={[NOTICES_QUERY_KEY, typeFilter, pageSize, page * pageSize]} isFetching={isFetching} />
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div 
        className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg dark:shadow-xl"
        variants={cardVariants}
      >
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-slate-500 dark:text-slate-400 text-sm mb-2 flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search Notices
            </label>
            <Input
              placeholder="Search by title, content, school..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                debouncedSetSearch(e.target.value);
              }}
              className="bg-slate-50 dark:bg-slate-800/50 border-blue-400 dark:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>

          <div className="min-w-[180px]">
            <label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Type</label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800/50 border-blue-400 dark:border-blue-500 text-slate-900 dark:text-white">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* Notices Table */}
      <motion.div 
        className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-lg dark:shadow-xl"
        variants={cardVariants}
      >
        {/* Show loading state when fetching with no data or filter changed */}
        {(isFetching || isLoading) && allNotices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="h-10 w-10 text-blue-500" />
            </motion.div>
            <span className="text-slate-500 dark:text-slate-400">Loading notices...</span>
          </div>
        ) : filteredNotices.length === 0 && !isLoading && !isFetching ? (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Bell className="h-16 w-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <div className="text-slate-500 dark:text-slate-400 text-lg">No notices found</div>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Try adjusting your filters</p>
          </motion.div>
        ) : (
          <div className="overflow-x-auto relative">
            {/* Inline loader when refetching with existing data */}
            {isFetching && allNotices.length > 0 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-3 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                  <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">Refreshing...</span>
                </div>
              </div>
            )}
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">Sl No.</th>
                  <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Title
                  </th>
                  <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">
                    <Tag className="h-4 w-4 inline mr-1" />
                    Type
                  </th>
                  <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">
                    <MessageSquare className="h-4 w-4 inline mr-1" />
                    Message
                  </th>
                  <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">
                    <Building2 className="h-4 w-4 inline mr-1" />
                    School
                  </th>
                  <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Date
                  </th>
                  <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">
                    <Paperclip className="h-4 w-4 inline mr-1" />
                    File
                  </th>
                  <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filteredNotices.map((notice: Notice, index: number) => (
                    <motion.tr 
                      key={notice.id}
                      custom={index >= previousLength ? index - previousLength : 0}
                      variants={tableRowVariants}
                      initial={index >= previousLength ? "hidden" : false}
                      animate="visible"
                      exit="exit"
                      whileHover="hover"
                      layout
                      className="border-b border-slate-100 dark:border-slate-800/50"
                    >
                      <td className="py-4 px-5 text-slate-500 dark:text-slate-400 font-mono text-sm">{index + 1}</td>
                      <td className="py-4 px-5">
                        <span className="text-blue-600 dark:text-blue-400 font-medium max-w-[200px] truncate block" title={notice.title}>
                          {notice.title}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <Badge className={typeStyles[notice.type] || typeStyles['GENERAL']}>
                          {noticeTypeLabels[notice.type as NoticeType] || 'General'}
                        </Badge>
                      </td>
                      <td className="py-4 px-5 max-w-[300px]">
                        <ExpandableText 
                          text={notice.content} 
                          maxLength={60} 
                          className="text-slate-600 dark:text-slate-400 text-sm" 
                        />
                      </td>
                      <td className="py-4 px-5 text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={notice.school?.name || 'All Schools'}>
                        {notice.school?.name || 'All Schools'}
                      </td>
                      <td className="py-4 px-5 text-slate-600 dark:text-slate-400">{formatDate(notice.created_at)}</td>
                      <td className="py-4 px-5">
                        <Badge className={notice.file_url 
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                          : 'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400'
                        }>
                          {notice.file_url ? 'Yes' : 'No'}
                        </Badge>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1">
                          <ViewNoticeButton notice={notice} />
                          <DeleteNoticeButton noticeId={notice.id} noticeTitle={notice.title} />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* Load More Section */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50">
          {isLoading && allNotices.length === 0 ? (
            <div className="flex items-center justify-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="h-5 w-5 text-blue-500" />
              </motion.div>
              <span className="text-slate-500 dark:text-slate-400 text-sm">Loading notices...</span>
            </div>
          ) : isError ? (
            <p className="text-red-500 dark:text-red-400 text-center text-sm">{(error as Error)?.message || 'Failed to load notices'}</p>
          ) : hasMore ? (
            <motion.button
              onClick={loadMore}
              disabled={isFetching}
              className="w-full py-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-500/5 hover:bg-blue-100 dark:hover:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg transition-all font-medium disabled:opacity-70"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {isFetching ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  <span className="text-blue-600 dark:text-blue-300">Loading more notices...</span>
                </span>
              ) : (
                'Load More'
              )}
            </motion.button>
          ) : (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Showing all {allNotices.length} records
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
