'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { showErrorToast, showSuccessToast } from './ui/custom-toast';

interface ApproveFormButtonProps {
  submissionId: string;
  formType?: string;
}

export function ApproveFormButton({ submissionId, formType }: ApproveFormButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: formSubmissionsApi.approve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-submissions'] });
      setDialogOpen(false);
      showSuccessToast('Form approved successfully');
    },
    onError: () => {
      showErrorToast('Failed to approve form');
    },
  });

  const handleApprove = () => {
    approveMutation.mutate(submissionId);
  };

  return (
    <>
      <Button
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-700"
        onClick={() => setDialogOpen(true)}
      >
        <Check className="h-4 w-4 mr-1" /> Approve
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Approve Form Submission</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Are you sure you want to approve this {formType || 'form'} submission? 
              This action will mark the form as verified and accepted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {approveMutation.isPending ? (
                <>
                  <div className='size-4 border-2 border-t-[3px] border-white/20 border-t-emerald-400 rounded-full animate-spin mr-2'/>
                  Approving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" /> Confirm Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
