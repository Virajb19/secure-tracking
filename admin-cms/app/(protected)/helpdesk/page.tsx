'use client';

import { useState } from 'react';
import { Trash2, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { helpdeskApi } from '@/services/helpdesk.service';
import { HelpdeskTicket } from '@/types';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();
  
  // Add ordinal suffix
  const suffix = ['th', 'st', 'nd', 'rd'];
  const v = day % 100;
  const ordinal = suffix[(v - 20) % 10] || suffix[v] || suffix[0];
  
  return `${day}${ordinal} ${month}, ${year}`;
}

export default function HelpdeskPage() {
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Fetch all helpdesk tickets
  const { data: tickets, isLoading, error } = useQuery<HelpdeskTicket[]>({
    queryKey: ['helpdesk-tickets'],
    queryFn: helpdeskApi.getAll,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: helpdeskApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-tickets'] });
      setDeleteConfirm(null);
    },
  });

  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: helpdeskApi.resolve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-tickets'] });
    },
  });

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      deleteMutation.mutate(id);
    } else {
      setDeleteConfirm(id);
      // Reset after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const handleResolve = (id: string) => {
    resolveMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Helpdesk</h1>
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-slate-400">Loading tickets...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Helpdesk</h1>
        <div className="bg-slate-900 rounded-xl border border-red-800 p-12 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <span className="ml-3 text-red-400">Failed to load tickets. Please try again.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Helpdesk</h1>
        <div className="text-sm text-slate-400">
          Total: {tickets?.length || 0} tickets
        </div>
      </div>

      {/* Helpdesk Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="overflow-x-auto">
          {tickets && tickets.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Sl No.</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Full Name</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Message</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Phone</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket, index) => (
                  <tr key={ticket.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="py-4 px-4 text-blue-400 font-medium">{index + 1}</td>
                    <td className="py-4 px-4 text-slate-300">{ticket.full_name}</td>
                    <td className="py-4 px-4 text-blue-400 max-w-md">
                      <div className="truncate" title={ticket.message}>
                        {ticket.message}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-300">{ticket.phone}</td>
                    <td className="py-4 px-4 text-slate-300">{formatDate(ticket.created_at)}</td>
                    <td className="py-4 px-4">
                      {ticket.is_resolved ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                          Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {!ticket.is_resolved && (
                          <button
                            onClick={() => handleResolve(ticket.id)}
                            disabled={resolveMutation.isPending}
                            className="p-1.5 text-slate-400 hover:text-green-400 transition-colors disabled:opacity-50"
                            title="Mark as Resolved"
                          >
                            {resolveMutation.isPending ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <CheckCircle className="h-5 w-5" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(ticket.id)}
                          disabled={deleteMutation.isPending}
                          className={`p-1.5 transition-colors disabled:opacity-50 ${
                            deleteConfirm === ticket.id
                              ? 'text-red-500 hover:text-red-400'
                              : 'text-slate-400 hover:text-red-400'
                          }`}
                          title={deleteConfirm === ticket.id ? 'Click again to confirm' : 'Delete'}
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Trash2 className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No helpdesk tickets found</p>
              <p className="text-sm mt-2">Tickets submitted by users will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
