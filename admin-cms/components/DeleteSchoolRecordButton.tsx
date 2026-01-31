'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { paperSetterApi } from '@/services/paper-setter.service';
import { toast } from 'sonner';

interface DeleteSchoolRecordButtonProps {
  schoolId: string;
  schoolName: string;
}

export function DeleteSchoolRecordButton({ schoolId, schoolName }: DeleteSchoolRecordButtonProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => paperSetterApi.deleteSchoolSelections(schoolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-wise-paper-setters'] });
      queryClient.invalidateQueries({ queryKey: ['paper-setter-selections'] });
      toast.success(`All selections for ${schoolName} deleted successfully`);
      setOpen(false);
    },
    onError: () => {
      toast.error('Failed to delete selections');
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          title="Delete all selections for this school"
        >
            {deleteMutation.isPending ? (
             <div className='size-4 border-2 border-t-[3px] border-slate-200 dark:border-white/20 border-t-red-700 rounded-full animate-spin'/>
          ) : (
              <Trash2 className="h-5 w-5" />
            )}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-900 dark:text-white">Delete School Selections</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
            Are you sure you want to delete all paper setter/checker selections for <span className="text-slate-900 dark:text-white font-medium">{schoolName}</span>? 
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              deleteMutation.mutate();
              setOpen(false);
            }}
            disabled={deleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
