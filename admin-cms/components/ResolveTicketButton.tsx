'use client';

import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { helpdeskApi } from '@/services/helpdesk.service';
import { showSuccessToast, showErrorToast } from '@/components/ui/custom-toast';

interface ResolveTicketButtonProps {
  ticketId: string;
}

export function ResolveTicketButton({ ticketId }: ResolveTicketButtonProps) {
  const queryClient = useQueryClient();

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

  return (
    <motion.button
      onClick={() => resolveMutation.mutate(ticketId)}
      disabled={resolveMutation.isPending}
      className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all disabled:opacity-50"
      title="Mark as Resolved"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      {resolveMutation.isPending ? (
        <div className='size-4 border-2 border-t-[3px] border-white/20 border-t-emerald-400 rounded-full animate-spin' />
      ) : (
        <CheckCircle className="h-5 w-5" />
      )}
    </motion.button>
  );
}
