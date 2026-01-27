'use client';

import { Trash2, CheckCircle, Loader2, AlertCircle, Headphones, Hash, User, MessageSquare, Phone, Calendar, RotateCcw, HelpCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { helpdeskApi } from '@/services/helpdesk.service';
import { HelpdeskTicket } from '@/types';
import { Badge } from '@/components/ui/badge';
import { DeleteTicketButton } from '@/components/DeleteTicketButton';
import { showSuccessToast, showErrorToast } from '@/components/ui/custom-toast';

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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  
  // Add ordinal suffix
  const suffix = ['th', 'st', 'nd', 'rd'];
  const v = day % 100;
  const ordinal = suffix[(v - 20) % 10] || suffix[v] || suffix[0];
  
  return `${day}${ordinal} ${month}, ${year}`;
}

export default function HelpdeskPage() {
  const queryClient = useQueryClient();

  // Fetch all helpdesk tickets
  const { data: tickets, isLoading, error } = useQuery<HelpdeskTicket[]>({
    queryKey: ['helpdesk-tickets'],
    queryFn: helpdeskApi.getAll,
    refetchOnMount: 'always',
  });

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

  // Toggle status mutation (for setting back to pending)
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

  const pendingCount = tickets?.filter(t => !t.is_resolved).length || 0;
  const resolvedCount = tickets?.filter(t => t.is_resolved).length || 0;

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
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
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
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
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
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <p className="text-red-400 text-lg">Failed to load tickets</p>
            <p className="text-slate-500 text-sm mt-2">Please try again later</p>
          </div>
        </motion.div>
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
              className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg"
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
            <Badge className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 px-3 py-1">
              {pendingCount} Pending
            </Badge>
            <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1">
              {resolvedCount} Resolved
            </Badge>
            <Badge className="bg-slate-700/50 text-slate-300 hover:bg-slate-700/50 px-3 py-1">
              {tickets?.length || 0} Total
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Tickets Table */}
      <motion.div 
        className="bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-xl"
        variants={cardVariants}
      >
        {tickets && tickets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                    <Hash className="h-4 w-4 inline mr-1" />
                    Sl No.
                  </th>
                  <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                    <User className="h-4 w-4 inline mr-1" />
                    Full Name
                  </th>
                  <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                    <MessageSquare className="h-4 w-4 inline mr-1" />
                    Message
                  </th>
                  <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                    <Phone className="h-4 w-4 inline mr-1" />
                    Phone
                  </th>
                  <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Date
                  </th>
                  <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">Status</th>
                  <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {tickets.map((ticket, index) => (
                    <motion.tr 
                      key={ticket.id}
                      custom={index}
                      variants={tableRowVariants}
                      initial="hidden"
                      animate="visible"
                      whileHover="hover"
                      className="border-b border-slate-100 dark:border-slate-800/50 cursor-pointer"
                    >
                      <td className="py-4 px-5">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full text-sm font-mono">
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">{ticket.full_name}</span>
                      </td>
                      <td className="py-4 px-5 max-w-xs">
                        <span 
                          className="text-slate-700 dark:text-slate-300 line-clamp-2" 
                          title={ticket.message}
                        >
                          {ticket.message}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-slate-700 dark:text-slate-300 font-mono text-sm bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded">
                          {ticket.phone}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-slate-500 dark:text-slate-400 text-sm">
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
        ) : (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Headphones className="h-16 w-16 text-slate-400 dark:text-slate-700 mx-auto mb-4" />
            <div className="text-slate-500 dark:text-slate-400 text-lg">No helpdesk tickets found</div>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Tickets submitted by users will appear here</p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
