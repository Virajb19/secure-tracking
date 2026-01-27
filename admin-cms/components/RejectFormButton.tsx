'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { formSubmissionsApi } from '@/services/paper-setter.service';
import { toast } from 'sonner';

interface RejectFormButtonProps {
  submissionId: string;
  formType?: string;
}

export function RejectFormButton({ submissionId, formType }: RejectFormButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const queryClient = useQueryClient();

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      formSubmissionsApi.reject(id, reason),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['form-submissions'] });
      setDialogOpen(false);
      setRejectReason('');
      toast.success('Form rejected successfully');
    },
    onError: () => {
      toast.error('Failed to reject form');
    },
  });

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    rejectMutation.mutate({ id: submissionId, reason: rejectReason });
  };

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setRejectReason('');
    }
  };

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className='bg-red-500 hover:opacity-80 duration-200 flex-center py-1 px-1.5 rounded-lg'
      >
        <X className="h-4 w-4 mr-1" /> Reject
      </button>

      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Reject Form Submission</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Please provide a reason for rejecting this {formType || 'form'} submission.
              The submitter will be notified of this rejection.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter the reason for rejection..."
              className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
            >
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
                <>
                  <X className="h-4 w-4 mr-2" /> Confirm Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
