'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Loader2, Shield, Clock, User, Activity, Globe } from 'lucide-react';
import { auditLogsApi } from '@/services/api';
import { AuditLog } from '@/types';
import { Badge } from '@/components/ui/badge';

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

// Action type colors
const actionColors: Record<string, { bg: string; text: string }> = {
  'USER_LOGIN': { bg: 'bg-green-500/20', text: 'text-green-400' },
  'USER_LOGIN_FAILED': { bg: 'bg-red-500/20', text: 'text-red-400' },
  'USER_CREATED': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  'TASK_CREATED': { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  'EVENT_UPLOADED': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  'DEVICE_ID_MISMATCH': { bg: 'bg-red-500/20', text: 'text-red-400' },
  'DEVICE_ID_BOUND': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [previousLength, setPreviousLength] = useState(0);
  const pageSize = 50;

  const fetchLogs = async (offset: number, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
        setPreviousLength(logs.length);
      } else {
        setLoading(true);
        setPreviousLength(0);
      }
      const data = await auditLogsApi.getAll(pageSize, offset);
      if (offset === 0) {
        setLogs(data);
      } else {
        setLogs(prev => [...prev, ...data]);
      }
      setHasMore(data.length === pageSize);
    } catch {
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchLogs(0);
  }, []);

  const loadMore = () => {
    const newPage = page + 1;
    setPage(newPage);
    fetchLogs(newPage * pageSize, true);
  };

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
              className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg"
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
              {logs.length} Records
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Logs Table */}
      <motion.div 
        className="bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-xl"
        variants={cardVariants}
      >
        {logs.length === 0 && !loading ? (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Shield className="h-16 w-16 text-slate-400 dark:text-slate-700 mx-auto mb-4" />
            <div className="text-slate-500 dark:text-slate-400 text-lg">No audit logs found</div>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">System activity will appear here</p>
          </motion.div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Timestamp
                  </th>
                  <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                    <Activity className="h-4 w-4 inline mr-1" />
                    Action
                  </th>
                  <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Entity Type
                  </th>
                  <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">Entity ID</th>
                  <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                    <User className="h-4 w-4 inline mr-1" />
                    User ID
                  </th>
                  <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                    <Globe className="h-4 w-4 inline mr-1" />
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {logs.map((log, index) => {
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
                        className="border-b border-slate-100 dark:border-slate-800/50"
                      >
                        <td className="py-4 px-5">
                          <span className="text-slate-700 dark:text-slate-300 text-sm">{formatDate(log.created_at)}</span>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${actionStyle.bg} ${actionStyle.text}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-slate-700 dark:text-slate-300 text-sm">{log.entity_type}</span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                            {log.entity_id ? log.entity_id.slice(0, 8) + '...' : '-'}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                            {log.user_id ? log.user_id.slice(0, 8) + '...' : '-'}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">{log.ip_address || '-'}</span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* Loading / Load More */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="h-5 w-5 text-blue-500" />
              </motion.div>
              <span className="text-slate-500 dark:text-slate-400 text-sm">Loading logs...</span>
            </div>
          ) : error ? (
            <p className="text-red-500 dark:text-red-400 text-center text-sm">{error}</p>
          ) : hasMore ? (
            <motion.button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-2.5 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all font-medium disabled:opacity-50"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {loadingMore ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </span>
              ) : (
                'Load More'
              )}
            </motion.button>
          ) : (
            <p className="text-center text-sm text-slate-500">
              Showing all {logs.length} records
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
