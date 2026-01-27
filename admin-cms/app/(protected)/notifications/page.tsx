'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Search, Bell, Loader2, FileText, Calendar, User, Building2 } from 'lucide-react';
import { DeleteNoticeButton } from '@/components/DeleteNoticeButton';
import { ViewNoticeButton } from '@/components/ViewNoticeButton';
import noticesService, { type Notice } from '@/services/notices.service';

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
      delay: i * 0.03,
      duration: 0.3
    }
  }),
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3 }
  }
};

const priorityOptions = [
  { value: 'all', label: 'All Priorities' },
  { value: 'HIGH', label: 'High Priority' },
  { value: 'NORMAL', label: 'Normal Priority' },
  { value: 'LOW', label: 'Low Priority' },
];

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function NotificationsPage() {
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch notices from API
  const { data: notices = [], isLoading, isError, error } = useQuery({
    queryKey: ['notices'],
    queryFn: () => noticesService.getAll(),
  });

  // Filter notices based on selections
  const filteredNotices = useMemo(() => {
    return notices.filter((notice: Notice) => {
      const matchesPriority = selectedPriority === 'all' || notice.priority === selectedPriority;
      const matchesStatus = selectedStatus === 'all' || 
        (selectedStatus === 'active' ? notice.is_active : !notice.is_active);
      const matchesSearch = searchQuery === '' || 
        notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notice.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (notice.school?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      return matchesPriority && matchesStatus && matchesSearch;
    });
  }, [notices, selectedPriority, selectedStatus, searchQuery]);

  // Stats
  const totalCount = notices.length;
  const highPriorityCount = notices.filter((n: Notice) => n.priority === 'HIGH').length;
  const activeCount = notices.filter((n: Notice) => n.is_active).length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const priorityStyles: Record<string, string> = {
    HIGH: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
    NORMAL: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
    LOW: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  };

  if (isLoading) {
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

  if (isError) {
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
          <div className="text-red-500 text-lg">Failed to load notices</div>
          <p className="text-slate-500 dark:text-slate-400">{(error as Error)?.message || 'Unknown error occurred'}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-8 p-2"
      variants={containerVariants}
      initial="hidden"
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
            <Badge className="bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 px-3 py-1">
              {highPriorityCount} High Priority
            </Badge>
            <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-3 py-1">
              {activeCount} Active
            </Badge>
            <Badge className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 px-3 py-1">
              {totalCount} Total
            </Badge>
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800/50 border-blue-400 dark:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>

          <div className="min-w-[180px]">
            <label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Priority</label>
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800/50 border-blue-400 dark:border-blue-500 text-slate-900 dark:text-white">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[150px]">
            <label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Status</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800/50 border-blue-400 dark:border-blue-500 text-slate-900 dark:text-white">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                {statusOptions.map((option) => (
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
        {filteredNotices.length === 0 ? (
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">Sl No.</th>
                  <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Title
                  </th>
                  <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">
                    Priority
                  </th>
                  <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">
                    <Building2 className="h-4 w-4 inline mr-1" />
                    School
                  </th>
                  <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">
                    <User className="h-4 w-4 inline mr-1" />
                    Created By
                  </th>
                  <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Date
                  </th>
                  <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">Status</th>
                  <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredNotices.map((notice: Notice, index: number) => (
                    <motion.tr 
                      key={notice.id}
                      custom={index}
                      variants={tableRowVariants}
                      initial="hidden"
                      animate="visible"
                      className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    >
                      <td className="py-4 px-5 text-slate-500 dark:text-slate-400 font-mono text-sm">{index + 1}</td>
                      <td className="py-4 px-5">
                        <span className="text-blue-600 dark:text-blue-400 font-medium max-w-[200px] truncate block" title={notice.title}>
                          {notice.title}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <Badge className={priorityStyles[notice.priority]}>
                          {notice.priority}
                        </Badge>
                      </td>
                      <td className="py-4 px-5 text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={notice.school?.name || 'All Schools'}>
                        {notice.school?.name || 'All Schools'}
                      </td>
                      <td className="py-4 px-5 text-slate-600 dark:text-slate-400">
                        {notice.creator?.name || 'System'}
                      </td>
                      <td className="py-4 px-5 text-slate-600 dark:text-slate-400">{formatDate(notice.created_at)}</td>
                      <td className="py-4 px-5">
                        <Badge className={notice.is_active 
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                          : 'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400'
                        }>
                          {notice.is_active ? 'Active' : 'Inactive'}
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
      </motion.div>
    </motion.div>
  );
}

