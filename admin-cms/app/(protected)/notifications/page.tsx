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
import { Search, Bell, Loader2, FileText, Calendar, Building2, Tag, Paperclip, MessageSquare } from 'lucide-react';
import { DeleteNoticeButton } from '@/components/DeleteNoticeButton';
import { ViewNoticeButton } from '@/components/ViewNoticeButton';
import { ExpandableText } from '@/components/ExpandableText';
import noticesService, { type Notice, type NoticeType } from '@/services/notices.service';

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

const typeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'General', label: 'General' },
  { value: 'Paper Setter', label: 'Paper Setter' },
  { value: 'Paper Checker', label: 'Paper Checker' },
  { value: 'Invitation', label: 'Invitation' },
  { value: 'Push Notification', label: 'Push Notification' },
];

const typeStyles: Record<string, string> = {
  'General': 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  'Paper Setter': 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
  'Paper Checker': 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
  'Invitation': 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  'Push Notification': 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
};

export default function NotificationsPage() {
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch notices from API
  const { data: notices = [], isLoading, isError, error } = useQuery({
    queryKey: ['notices'],
    queryFn: () => noticesService.getAll(),
  });

  // Filter notices based on selections
  const filteredNotices = useMemo(() => {
    return notices.filter((notice: Notice) => {
      const matchesType = selectedType === 'all' || notice.type === selectedType;
      const matchesSearch = searchQuery === '' || 
        notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notice.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (notice.school?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      return matchesType && matchesSearch;
    });
  }, [notices, selectedType, searchQuery]);

  // Stats
  const totalCount = notices.length;
  const withFileCount = notices.filter((n: Notice) => n.file_url).length;
  const typeCounts = {
    general: notices.filter((n: Notice) => n.type === 'General').length,
    paperSetter: notices.filter((n: Notice) => n.type === 'Paper Setter').length,
    invitation: notices.filter((n: Notice) => n.type === 'Invitation').length,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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
            <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 px-3 py-1">
              {typeCounts.general} General
            </Badge>
            <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-3 py-1">
              {withFileCount} With Files
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
                        <Badge className={typeStyles[notice.type] || typeStyles['General']}>
                          {notice.type || 'General'}
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
      </motion.div>
    </motion.div>
  );
}

