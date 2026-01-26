'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
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
import { toast } from 'sonner';

interface DeleteNotificationButtonProps {
  notificationId: string;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

export function DeleteNotificationButton({
  notificationId,
  onDelete,
  disabled = false,
}: DeleteNotificationButtonProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    setOpen(false);
    
    // Simulate API call delay
    await new Promise((r) => setTimeout(r, 1000));
    
    try {
      onDelete(notificationId);
      toast.success('Notification deleted successfully');
    } catch (error) {
      toast.error('Failed to delete notification');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        disabled={disabled || isDeleting}
        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all disabled:opacity-50"
        title="Delete"
        whileHover={{ scale: isDeleting ? 1 : 1.1 }}
        whileTap={{ scale: isDeleting ? 1 : 0.9 }}
      >
        {isDeleting ? (
          <div className='size-5 border-2 border-t-[3px] border-white/20 border-t-red-600 rounded-full animate-spin'/>
        ) : (
          <Trash2 className="h-5 w-5" />
        )}
      </motion.button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700/50 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-lg font-semibold flex items-center gap-2">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              Delete Notification?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete this notification?
              <br />
              <span className="text-red-400 font-medium">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white transition-all duration-200">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white transition-all duration-200"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
