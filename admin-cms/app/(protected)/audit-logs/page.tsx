'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Loader2, Shield, Clock, User, Activity, Globe } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { auditLogsApi } from '@/services/api';
import { AuditLog } from '@/types';
import { Badge } from '@/components/ui/badge';
import { RefreshTableButton } from '@/components/RefreshTableButton';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
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
    transition: { delay: i * 0.03, duration: 0.3 }
  }),
  hover: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
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

// Action type colors - unique color for each action
const actionColors: Record<string, { bg: string; text: string }> = {
  // User actions
  'USER_LOGIN': { bg: 'bg-green-500/20', text: 'text-green-400' },
  'USER_LOGOUT': { bg: 'bg-red-500/20', text: 'text-red-400' },
  'USER_LOGIN_FAILED': { bg: 'bg-rose-600/20', text: 'text-rose-400' },
  'USER_CREATED': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  'USER_UPDATED': { bg: 'bg-sky-500/20', text: 'text-sky-400' },
  'USER_DELETED': { bg: 'bg-pink-600/20', text: 'text-pink-400' },
  'USER_ACTIVATED': { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  'USER_DEACTIVATED': { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  // Device actions
  'DEVICE_ID_MISMATCH': { bg: 'bg-red-700/20', text: 'text-red-300' },
  'DEVICE_ID_BOUND': { bg: 'bg-green-600/20', text: 'text-green-300' },
  'DEVICE_ID_RESET': { bg: 'bg-orange-600/20', text: 'text-orange-300' },
  // Password actions
  'PASSWORD_CHANGED': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  'PASSWORD_RESET': { bg: 'bg-amber-600/20', text: 'text-amber-300' },
  // Task actions
  'TASK_CREATED': { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  'TASK_UPDATED': { bg: 'bg-violet-500/20', text: 'text-violet-400' },
  'TASK_DELETED': { bg: 'bg-fuchsia-600/20', text: 'text-fuchsia-400' },
  'TASK_COMPLETED': { bg: 'bg-purple-600/20', text: 'text-purple-300' },
  // Event actions  
  'EVENT_CREATED': { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  'EVENT_UPDATED': { bg: 'bg-indigo-600/20', text: 'text-indigo-300' },
  'EVENT_DELETED': { bg: 'bg-indigo-700/20', text: 'text-indigo-300' },
  'EVENT_UPLOADED': { bg: 'bg-lime-500/20', text: 'text-lime-400' },
  // Notice actions
  'NOTICE_CREATED': { bg: 'bg-teal-500/20', text: 'text-teal-400' },
  'NOTICE_UPDATED': { bg: 'bg-teal-600/20', text: 'text-teal-300' },
  'NOTICE_DELETED': { bg: 'bg-teal-700/20', text: 'text-teal-300' },
  // Circular actions
  'CIRCULAR_CREATED': { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  'CIRCULAR_UPDATED': { bg: 'bg-cyan-600/20', text: 'text-cyan-300' },
  'CIRCULAR_DELETED': { bg: 'bg-cyan-700/20', text: 'text-cyan-300' },
  // Form actions
  'FORM_SUBMITTED': { bg: 'bg-blue-400/20', text: 'text-blue-300' },
  'FORM_APPROVED': { bg: 'bg-green-400/20', text: 'text-green-300' },
  'FORM_REJECTED': { bg: 'bg-red-400/20', text: 'text-red-300' },
  'FORM_UPDATED': { bg: 'bg-blue-600/20', text: 'text-blue-300' },
  // Bank details actions
  'BANK_DETAILS_CREATED': { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  'BANK_DETAILS_UPDATED': { bg: 'bg-amber-600/20', text: 'text-amber-300' },
  // Star actions
  'USER_STARRED': { bg: 'bg-yellow-400/20', text: 'text-yellow-400' },
  'USER_UNSTARRED': { bg: 'bg-yellow-600/20', text: 'text-yellow-300' },
  // Helpdesk actions
  'TICKET_CREATED': { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  'TICKET_RESOLVED': { bg: 'bg-green-500/20', text: 'text-green-300' },
  'TICKET_DELETED': { bg: 'bg-red-600/20', text: 'text-red-300' },
  // Notification actions
  'NOTIFICATION_SENT': { bg: 'bg-blue-500/20', text: 'text-blue-300' },
};

export default function AuditLogsPage() {
  const [allLogs, setAllLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(0);
  const [previousLength, setPreviousLength] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 50;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  // useQuery for fetching audit logs
  const { 
    data: logsData, 
    isLoading, 
    isFetching,
    isError, 
    error 
  } = useQuery({
    queryKey: ['auditLogs', pageSize, page * pageSize],
    queryFn: () => auditLogsApi.getAll(pageSize, page * pageSize),
  });

  // Update allLogs when data changes
  useEffect(() => {
    if (logsData) {
      // Update hasMore based on returned data length
      setHasMore(logsData.length === pageSize);
      
      if (page === 0) {
        setAllLogs(logsData);
        setPreviousLength(0);
      } else {
        setAllLogs(prev => {
          setPreviousLength(prev.length);
          const existingIds = new Set(prev.map(l => l.id));
          const newLogs = logsData.filter(l => !existingIds.has(l.id));
          return [...prev, ...newLogs];
        });
      }
      setIsLoadingMore(false);
    }
  }, [logsData, page, pageSize]);

  // Use a ref to track state for scroll handlers (avoids stale closure issues)
  const stateRef = useRef({ hasMore, isFetching, isLoadingMore, hasData: allLogs.length > 0 });
  useEffect(() => {
    stateRef.current = { hasMore, isFetching, isLoadingMore, hasData: allLogs.length > 0 };
  }, [hasMore, isFetching, isLoadingMore, allLogs.length]);

  const loadMore = useCallback(() => {
    const { hasMore: currentHasMore, isFetching: currentFetching, isLoadingMore: currentLoadingMore, hasData } = stateRef.current;
    // Only load more if we have initial data, not fetching, not already loading more, and there's more to load
    if (hasData && !currentFetching && !currentLoadingMore && currentHasMore) {
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
    }
  }, []);

  // Infinite scroll handler
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      if (isNearBottom) {
        loadMore();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  // Edge-case handler: if user scrolls to bottom while data
  // is still loading, the scroll event is lost.
  // This effect re-triggers pagination after data arrives.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || allLogs.length === 0) return;

    // Small delay to ensure DOM has updated
    const timer = setTimeout(() => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (isAtBottom && hasMore && !isFetching && !isLoadingMore) {
        loadMore();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [logsData, hasMore, isFetching, isLoadingMore, loadMore, allLogs.length]);

  // Auto-load next page if content does not overflow the container.
  // This handles the initial render where scroll events never fire
  // because the content is shorter than the scroll container.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || allLogs.length === 0) return;

    // Small delay to ensure DOM has updated after render
    const timer = setTimeout(() => {
      const { scrollHeight, clientHeight } = container;
      const isNotScrollable = scrollHeight <= clientHeight;

      if (isNotScrollable && hasMore && !isFetching && !isLoadingMore) {
        loadMore();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [logsData, hasMore, isFetching, isLoadingMore, loadMore, allLogs.length]);



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

  const getActionStyle = (action: string) => {
    return actionColors[action] || { bg: 'bg-slate-700', text: 'text-slate-300' };
  };

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
              className="p-2 bg-linear-to-br from-amber-500 to-orange-600 rounded-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Shield className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Logs</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Immutable system activity and security logs</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-amber-500/20 text-amber-400 text-lg hover:bg-amber-500/20 px-3 py-1">
              <FileText className="h-6 w-6 mr-1" />
              {allLogs.length} Records
            </Badge>
            <RefreshTableButton queryKey={['auditLogs', pageSize, page * pageSize]} isFetching={isFetching} />
          </div>
        </div>
      </motion.div>

      {/* Logs Table */}
      <motion.div 
        className="bg-linear-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl"
        variants={cardVariants}
      >
        {allLogs.length === 0 && !isLoading ? (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Shield className="h-16 w-16 text-slate-700 mx-auto mb-4" />
            <div className="text-slate-400 text-lg">No audit logs found</div>
            <p className="text-slate-500 text-sm mt-2">System activity will appear here</p>
          </motion.div>
        ) : (
          <div ref={scrollContainerRef} className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 backdrop-blur-md bg-slate-800/80">
                <tr className="bg-slate-800/50 border-b border-slate-700">
                  <th className="text-left py-4 px-5 text-slate-400 font-medium text-sm">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Timestamp
                  </th>
                  <th className="text-left py-4 px-5 text-slate-400 font-medium text-sm">
                    <Activity className="h-4 w-4 inline mr-1" />
                    Action
                  </th>
                  <th className="text-left py-4 px-5 text-slate-400 font-medium text-sm">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Entity Type
                  </th>
                  <th className="text-left py-4 px-5 text-slate-400 font-medium text-sm">Entity ID</th>
                  <th className="text-left py-4 px-5 text-slate-400 font-medium text-sm">
                    <User className="h-4 w-4 inline mr-1" />
                    User ID
                  </th>
                  <th className="text-left py-4 px-5 text-slate-400 font-medium text-sm">
                    <Globe className="h-4 w-4 inline mr-1" />
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {allLogs.map((log, index) => {
                    const actionStyle = getActionStyle(log.action);
                    const isNew = index >= previousLength;
                    return (
                      <motion.tr 
                        key={log.id}
                        custom={isNew ? index - previousLength : index}
                        variants={tableRowVariants}
                        initial={isNew ? "hidden" : false}
                        animate="visible"
                        whileHover="hover"
                        className="border-b border-slate-800/50"
                      >
                        <td className="py-4 px-5">
                          <span className="text-slate-300 text-sm">{formatDate(log.created_at)}</span>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${actionStyle.bg} ${actionStyle.text}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-slate-300 text-sm">{log.entity_type}</span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">
                            {log.entity_id ? log.entity_id.slice(0, 8) + '...' : '-'}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">
                            {log.user_id ? log.user_id.slice(0, 8) + '...' : '-'}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-sm text-slate-400 font-mono">{log.ip_address || '-'}</span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* Loading / Status */}
        <div className="px-6 py-4 border-t border-slate-700/50">
          {isLoading && allLogs.length === 0 ? (
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              <span className="text-slate-400 text-sm">Loading logs...</span>
            </div>
          ) : isError ? (
            <p className="text-red-400 text-center text-sm">{(error as Error)?.message || 'Failed to load audit logs'}</p>
          ) : (isFetching || isLoadingMore) ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
              <span className="text-slate-400 text-sm">Loading more...</span>
            </div>
          ) : hasMore ? (
            <p className="text-center text-sm text-slate-500">Scroll down to load more</p>
          ) : (
            <p className="text-center text-sm text-slate-500">
              Showing all {allLogs.length} records
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
