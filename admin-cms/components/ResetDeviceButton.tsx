'use client';

import { useState } from 'react';
import { Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useResetDevice } from '@/services/user.service';
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
import { toast } from 'sonner';

interface ResetDeviceButtonProps {
  userId: string;
  userName: string;
}

export function ResetDeviceButton({ userId, userName }: ResetDeviceButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const resetDevice = useResetDevice();

  const handleReset = async () => {
    try {
      await resetDevice.mutateAsync(userId);
      toast.success('Device reset successfully', {
        description: `${userName} can now login from a new device.`,
      });
      setIsOpen(false);
    } catch (error) {
      toast.error('Failed to reset device', {
        description: 'Please try again.',
      });
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <motion.button
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-all"
          title="Reset Device Binding"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Smartphone className="h-5 w-5" />
        </motion.button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-slate-900 border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Reset Device Binding?</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            This will allow <span className="font-semibold text-blue-400">{userName}</span> to login from a new device. 
            Their current device binding will be removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            disabled={resetDevice.isPending}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {resetDevice.isPending ? 'Resetting...' : 'Reset Device'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
