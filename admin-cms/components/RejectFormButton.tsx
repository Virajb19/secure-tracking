'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { formSubmissionsApi } from '@/services/paper-setter.service';
import { showErrorToast, showSuccessToast } from './ui/custom-toast';
import { rejectFormSchema } from '@/lib/zod';
import { z } from 'zod';

type RejectFormValues = z.infer<typeof rejectFormSchema>;

interface RejectFormButtonProps {
  submissionId: string;
  formType?: string;
}

export function RejectFormButton({ submissionId, formType }: RejectFormButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<RejectFormValues>({
    resolver: zodResolver(rejectFormSchema),
    defaultValues: {
      reason: '',
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      formSubmissionsApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-submissions'] });
      handleOpenChange(false);
      showSuccessToast('Form rejected successfully');
    },
    onError: () => {
      showErrorToast('Failed to reject form');
    },
  });

  const onSubmit = async (values: RejectFormValues) => {
    if (values.reason.length > 500) {
      showErrorToast('Rejection reason is too long (max 500 characters)');
      return;
    }
    await rejectMutation.mutateAsync({ id: submissionId, reason: values.reason });
  };

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      form.reset();
    }
  };

  // const isSubmitting = form.formState.isSubmitting || rejectMutation.isPending;
  const reasonValue = form.watch('reason');

  return (
    <>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setDialogOpen(true)}
        className='bg-red-500 hover:opacity-80 duration-200 flex-center py-1 px-1.5 rounded-lg'
      >
        <X className="h-4 w-4 mr-1" /> Reject
      </Button>

      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Reject Form Submission</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Please provide a reason for rejecting this {formType || 'form'} submission.
              The submitter will be notified of this rejection.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-600 dark:text-slate-400">
                      Rejection Reason <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter the reason for rejection..."
                        className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        rows={4}
                      />
                    </FormControl>
                    <div className="flex justify-between items-center">
                      <FormMessage />
                      <span className={`text-xs ${reasonValue.length > 500 ? 'text-red-500' : 'text-slate-400'}`}>
                        {reasonValue.length}/500
                      </span>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => handleOpenChange(false)}
                  className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  variant="destructive" 
                  disabled={form.formState.isSubmitting || !reasonValue.trim()}
                  className={!reasonValue.trim() ? 'cursor-not-allowed' : ''}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <div className='size-4 border-2 border-t-[3px] border-white/20 border-t-red-600 rounded-full animate-spin mr-2'/>
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" /> Confirm Reject
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
