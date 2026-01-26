'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Search, Download, FileText, Check, X, Loader2, AlertTriangle, Eye } from 'lucide-react';
import { formSubmissionsApi, FormSubmission } from '@/services/paper-setter.service';
import { toast } from 'sonner';

const formTypes = [
  { value: '6A', label: 'Form 6A (Class VIII)' },
  { value: '6B', label: 'Form 6B (Class IX - X)' },
  { value: '6C_LOWER', label: 'Form 6C Lower (Class XI)' },
  { value: '6C_HIGHER', label: 'Form 6C Higher (Class XII)' },
  { value: '6D', label: 'Form 6D' },
];

export default function Form6Page() {
  const queryClient = useQueryClient();
  const [formType, setFormType] = useState('all');
  const [page, setPage] = useState(1);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [rejectReason, setRejectReason] = useState('');

  // Fetch pending submissions
  const { data, isLoading, error } = useQuery({
    queryKey: ['form-submissions', formType, page],
    queryFn: () => formSubmissionsApi.getPending(
      formType !== 'all' ? formType : undefined,
      page,
      20
    ),
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: formSubmissionsApi.approve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-submissions'] });
      toast.success('Form approved successfully');
    },
    onError: () => {
      toast.error('Failed to approve form');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      formSubmissionsApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-submissions'] });
      setRejectDialog({ open: false, id: null });
      setRejectReason('');
      toast.success('Form rejected successfully');
    },
    onError: () => {
      toast.error('Failed to reject form');
    },
  });

  const handleApprove = (id: string) => {
    if (confirm('Are you sure you want to approve this form?')) {
      approveMutation.mutate(id);
    }
  };

  const handleReject = () => {
    if (!rejectDialog.id || !rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    rejectMutation.mutate({ id: rejectDialog.id, reason: rejectReason });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500">Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500">Rejected</Badge>;
      case 'SUBMITTED':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500">Pending</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-400 border-slate-400">Draft</Badge>;
    }
  };

  const submissions = data?.data || [];
  const total = data?.total || 0;

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        <AlertTriangle className="mr-2" /> Failed to load form submissions
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Form 6 Approvals</h1>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download XLSX
          </Button>
          <Button className="gap-2 bg-slate-800 hover:bg-slate-700">
            <FileText className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <p className="text-slate-400 text-sm">Pending</p>
          <p className="text-2xl font-bold text-orange-400">{total}</p>
        </div>
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <p className="text-slate-400 text-sm">Approved Today</p>
          <p className="text-2xl font-bold text-emerald-400">-</p>
        </div>
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <p className="text-slate-400 text-sm">Rejected Today</p>
          <p className="text-2xl font-bold text-red-400">-</p>
        </div>
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <p className="text-slate-400 text-sm">Total Processed</p>
          <p className="text-2xl font-bold text-blue-400">-</p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        {/* Filter Dropdowns */}
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div className="flex-1 min-w-[250px]">
            <label className="text-sm text-slate-400 mb-1 block">Form Type</label>
            <Select value={formType} onValueChange={setFormType}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="All Form Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Form Types</SelectItem>
                {formTypes.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button className="bg-blue-600 hover:bg-blue-700 px-6">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          /* Table */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Sl No.</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">School</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Form Type</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Submitted At</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">
                      No pending form submissions
                    </td>
                  </tr>
                ) : (
                  submissions.map((submission, index) => (
                    <tr key={submission.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-4 px-4 text-slate-300">{(page - 1) * 20 + index + 1}</td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-blue-400 font-medium">
                            {submission.school?.name || 'School Name'}
                          </p>
                          <p className="text-slate-500 text-sm">
                            {submission.school?.district?.name || 'District'}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-300">
                        {formTypes.find(f => f.value === submission.form_type)?.label || submission.form_type}
                      </td>
                      <td className="py-4 px-4 text-slate-300">
                        {submission.submitted_at 
                          ? new Date(submission.submitted_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'
                        }
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(submission.status)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
                          >
                            <Eye className="h-4 w-4 mr-1" /> View
                          </Button>
                          {submission.status === 'SUBMITTED' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleApprove(submission.id)}
                                disabled={approveMutation.isPending}
                              >
                                <Check className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setRejectDialog({ open: true, id: submission.id })}
                              >
                                <X className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-slate-400 text-sm">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={page * 20 >= total}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ open, id: open ? rejectDialog.id : null })}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Form Submission</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm text-slate-400 mb-2 block">
              Please provide a reason for rejection (required)
            </label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="bg-slate-800 border-slate-700 text-white"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, id: null })}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
            >
              {rejectMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rejecting...</>
              ) : (
                'Confirm Reject'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
