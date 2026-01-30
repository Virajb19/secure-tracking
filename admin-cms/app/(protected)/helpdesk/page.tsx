'use client';

import { useState, useEffect, useMemo } from 'react';
import { Trash2, CheckCircle, Loader2, Headphones, Hash, User, MessageSquare, Phone, Calendar, RotateCcw, HelpCircle, Search, Filter, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { helpdeskApi, HelpdeskResponse } from '@/services/helpdesk.service';
import { HelpdeskTicket } from '@/types';
import { Badge } from '@/components/ui/badge';
import { DeleteTicketButton } from '@/components/DeleteTicketButton';
import { ExpandableText } from '@/components/ExpandableText';
import { showSuccessToast, showErrorToast } from '@/components/ui/custom-toast';
import { RetryButton } from '@/components/RetryButton';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import { useDebounceCallback } from 'usehooks-ts';

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
    transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' as const }
  }),
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.2 }
  },
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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const suffix = ['th', 'st', 'nd', 'rd'];
  const v = day % 100;
  const ordinal = suffix[(v - 20) % 10] || suffix[v] || suffix[0];
  return `${day}${ordinal} ${month}, ${year}`;
}

export default function HelpdeskPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [allTickets, setAllTickets] = useState<HelpdeskTicket[]>([]);
  const [offset, setOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageSize = 20;

  // Debounce the search
  const debouncedSetSearch = useDebounceCallback(setSearchQuery, 500);

  // Handler for status filter change - handles clicking same filter
  const handleStatusFilterChange = (newFilter: string | undefined) => {  
      setStatusFilter(newFilter);
  };

  // Fetch helpdesk tickets with pagination
  const { data, isLoading, isFetching, error } = useQuery<HelpdeskResponse>({
    queryKey: ['helpdesk-tickets', pageSize, offset, statusFilter],
    queryFn: () => helpdeskApi.getAll(pageSize, offset, statusFilter),
  });

  // Update allTickets when data changes
  useEffect(() => {
    if (data) {
      if (offset === 0) {
        setAllTickets(data.data);
      } else {
        setAllTickets(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const newTickets = data.data.filter(t => !existingIds.has(t.id));
          return [...prev, ...newTickets];
        });
      }
      setIsLoadingMore(false);
    }
  }, [data, offset]);

  // Reset when filter changes (different filter selected)
  useEffect(() => {
    setOffset(0);
    setAllTickets([]);
  }, [statusFilter]);

  const loadMore = () => {
    if (!isFetching && !isLoadingMore && data?.hasMore) {
      setIsLoadingMore(true);
      setOffset(prev => prev + pageSize);
    }
  };

  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: helpdeskApi.resolve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-tickets'] });
      showSuccessToast('Ticket marked as resolved!', 3000);
    },
    onError: () => {
      showErrorToast('Failed to resolve ticket. Please try again.');
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: helpdeskApi.toggleStatus,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-tickets'] });
      showSuccessToast(
        data.is_resolved ? 'Ticket marked as resolved!' : 'Ticket set back to pending!',
        3000
      );
    },
    onError: () => {
      showErrorToast('Failed to update ticket status. Please try again.');
    },
  });

  const handleResolve = (id: string) => {
    resolveMutation.mutate(id);
  };

  // Filter tickets by search (client-side for loaded tickets)
  const filteredTickets = useMemo(() => {
        if (!searchQuery) return allTickets;
        const q = searchQuery.toLowerCase();
        return allTickets.filter(ticket =>
          ticket.full_name.toLowerCase().includes(q) ||
          ticket.phone.toLowerCase().includes(q) ||
          ticket.message.toLowerCase().includes(q)
        );
}, [allTickets, searchQuery]);
  

  if (isLoading && allTickets.length === 0) {
    return (
      <motion.div 
        className="space-y-8 p-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-linear-to-br from-purple-500 to-pink-600 rounded-lg">
              <HelpCircle className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Helpdesk</h1>
          </div>
        </motion.div>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="h-10 w-10 text-blue-500" />
          </motion.div>
          <span className="text-slate-400">Loading tickets...</span>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        className="space-y-8 p-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-linear-to-br from-purple-500 to-pink-600 rounded-lg">
              <HelpCircle className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Helpdesk</h1>
          </div>
        </motion.div>
        <motion.div 
          className="flex items-center justify-center h-96"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <RetryButton 
            queryKey={['helpdesk-tickets', pageSize, offset, statusFilter]} 
            message="Failed to load tickets" 
          />
        </motion.div>
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
              className="p-2 bg-linear-to-br from-purple-500 to-pink-600 rounded-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <HelpCircle className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Helpdesk</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Manage support tickets from users</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-slate-700/50 text-slate-300 hover:bg-slate-700/50 px-3 py-1">
              {data?.total || 0} Total
            </Badge>
            <RefreshTableButton queryKey={['helpdesk-tickets', pageSize, offset, statusFilter]} isFetching={isFetching} />
          </div>
        </div>
      </motion.div>

      {/* Search and Filter Bar */}
      <motion.div 
        className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
        variants={itemVariants}
      >
        {/* Search Input */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or message..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              debouncedSetSearch(e.target.value);
            }}
            className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                setSearchQuery('');
              }}
              className="absolute right-3 top-1/2 p-2 rounded-full hover:bg-red-500/30 duration-200 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status Filter Buttons */}
        <div className="flex gap-2">
          <motion.button
            onClick={() => handleStatusFilterChange(undefined)}
            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
              statusFilter === undefined
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            All
          </motion.button>
          <motion.button
            onClick={() => handleStatusFilterChange('pending')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
              statusFilter === 'pending'
                ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/25'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Filter className="h-4 w-4" />
            Pending
          </motion.button>
          <motion.button
            onClick={() => handleStatusFilterChange('resolved')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
              statusFilter === 'resolved'
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <CheckCircle className="h-4 w-4" />
            Resolved
          </motion.button>
        </div>
      </motion.div>

      {/* Tickets Table */}
      <motion.div 
        className="bg-linear-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl relative"
        variants={cardVariants}
      >
        {/* Show loading state when fetching with no data (e.g., after filter change) */}
        {(isFetching || isLoading) && allTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="h-10 w-10 text-blue-500" />
            </motion.div>
            <span className="text-slate-400">Loading tickets...</span>
          </div>
        ) : filteredTickets.length > 0 ? (
          <>
            <div className="overflow-x-auto relative">
              {/* Inline loader when refetching with existing data */}
              {isFetching && allTickets.length > 0 && !isLoadingMore && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="flex items-center gap-3 bg-slate-800 px-4 py-3 rounded-xl shadow-xl border border-slate-700">
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                    <span className="text-slate-300 text-sm font-medium">Refreshing...</span>
                  </div>
                </div>
              )}
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-800/50 border-b border-slate-700">
                    <th className="text-left py-4 px-5 text-slate-400 font-medium text-sm">
                      <Hash className="h-4 w-4 inline mr-1" />
                      Sl No.
                    </th>
                    <th className="text-left py-4 px-5 text-slate-400 font-medium text-sm">
                      <User className="h-4 w-4 inline mr-1" />
                      Full Name
                    </th>
                    <th className="text-left py-4 px-5 text-slate-400 font-medium text-sm">
                      <MessageSquare className="h-4 w-4 inline mr-1" />
                      Message
                    </th>
                    <th className="text-left py-4 px-5 text-slate-400 font-medium text-sm">
                      <Phone className="h-4 w-4 inline mr-1" />
                      Phone
                    </th>
                    <th className="text-left py-4 px-5 text-slate-400 font-medium text-sm">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Date
                    </th>
                    <th className="text-left py-4 px-5 text-slate-400 font-medium text-sm">Status</th>
                    <th className="text-left py-4 px-5 text-slate-400 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {filteredTickets.map((ticket, index) => (
                      <motion.tr 
                        key={ticket.id}
                        custom={index}
                        variants={tableRowVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        whileHover="hover"
                        layout
                        className="border-b border-slate-800/50 cursor-pointer"
                      >
                        <td className="py-4 px-5">
                          <span className="bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full text-sm font-mono">
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-blue-400 font-medium">{ticket.full_name}</span>
                        </td>
                        <td className="py-4 px-5 max-w-xs">
                          <ExpandableText 
                            text={ticket.message} 
                            maxLength={60} 
                            className="text-slate-300 text-sm" 
                          />
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-slate-300 font-mono text-sm bg-slate-800/50 px-2 py-1 rounded">
                            {ticket.phone}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-slate-400 text-sm">
                          {formatDate(ticket.created_at)}
                        </td>
                        <td className="py-4 px-5">
                          {ticket.is_resolved ? (
                            <Badge variant="success" className="bg-emerald-500/20 text-emerald-400 border-0">
                              Resolved
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="bg-yellow-500/20 text-yellow-400 border-0">
                              Pending
                            </Badge>
                          )}
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            {!ticket.is_resolved ? (
                              <motion.button
                                onClick={() => handleResolve(ticket.id)}
                                disabled={resolveMutation.isPending}
                                className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all disabled:opacity-50"
                                title="Mark as Resolved"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                {resolveMutation.isPending ? (
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-5 w-5" />
                                )}
                              </motion.button>
                            ) : (
                              <motion.button
                                onClick={() => toggleStatusMutation.mutate(ticket.id)}
                                disabled={toggleStatusMutation.isPending}
                                className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-all disabled:opacity-50"
                                title="Set back to Pending"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                {toggleStatusMutation.isPending ? (
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-5 w-5" />
                                )}
                              </motion.button>
                            )}
                            <DeleteTicketButton ticketId={ticket.id} />
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Load More / Record count */}
            <div className="px-6 py-4 border-t border-slate-700/50">
              {data?.hasMore ? (
                <motion.button
                  onClick={loadMore}
                  disabled={isFetching || isLoadingMore}
                  className="w-full py-3 text-sm text-blue-400 hover:text-blue-300 bg-blue-500/5 hover:bg-blue-500/10 rounded-lg transition-all font-medium disabled:opacity-70 border border-blue-500/20"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {isLoadingMore ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                      <span className="text-blue-300">Loading more tickets...</span>
                    </span>
                  ) : (
                    `Load More (${(data?.total || 0) - allTickets.length} remaining)`
                  )}
                </motion.button>
              ) : (
                <p className="text-center text-sm text-slate-500">
                  Showing all {filteredTickets.length} records
                </p>
              )}
            </div>
          </>
        ) : (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Headphones className="h-16 w-16 text-slate-700 mx-auto mb-4" />
            <div className="text-slate-400 text-lg">
              {searchInput ? 'No matching tickets found' : 'No helpdesk tickets found'}
            </div>
            <p className="text-slate-500 text-sm mt-2">
              {searchInput 
                ? 'Try adjusting your search criteria' 
                : 'Tickets submitted by users will appear here'}
            </p>
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                }}
                className="mt-4 text-blue-500 hover:text-blue-600 text-sm font-medium"
              >
                Clear search
              </button>
            )}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
