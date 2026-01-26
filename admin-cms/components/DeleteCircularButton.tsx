'use client';

import { useState } from 'react';
import { Loader, Loader2, Trash2 } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { circularsApi } from '@/services/api';
import { toast } from 'sonner';

interface DeleteCircularButtonProps {
  circularId: string;
  disabled?: boolean;
}

export function DeleteCircularButton({
  circularId,
  disabled = false,
}: DeleteCircularButtonProps) {

  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
      mutationFn: async () => {
       await circularsApi.delete(circularId)
     },
     onSuccess: () => {
       toast.success('Circular deleted successfully', { closeButton: false});
       setOpen(false);
     },
     onError: (error) => {
       console.error('Failed to delete circular', error);
       toast.error('Failed to delete circular. Please try again.');
     },
     onSettled: () => {
       queryClient.refetchQueries({ queryKey: ['circulars'] });
     }
  })

  return (
    <>
      <Button
        variant="destructive"
        size="icon"
        disabled={disabled || deleteMutation.isPending}
        onClick={() => setOpen(true)}
        title="Delete Circular"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className='bg-slate-950 border border-slate-800 text-slate-200 shadow-2xl'>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Circular?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will remove the circular from all users.
              <br />
              <span className="text-red-600 font-medium">
                This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel className='bg-green-500 hover:bg-green-600 border-transparent'>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutateAsync()}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                  <>
                     <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...
                  </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
