'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
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

export function LogoutButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      <motion.button
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-300 bg-red-800 hover:bg-red-600/20 hover:text-red-400 transition-all duration-200"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <LogOut className="w-5 h-5" />
        <span className="hidden sm:inline font-medium">Logout</span>
      </motion.button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-slate-900 border-slate-700/50 rounded-2xl overflow-hidden p-0">
          {/* Red header background */}
          <div className="bg-linear-to-r from-red-600 to-red-700 p-6">
            <AlertDialogHeader className="space-y-2">
              <AlertDialogTitle className="text-white flex items-center gap-3 text-lg font-semibold">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                  <LogOut className="h-5 w-5 text-white" />
                </div>
                Confirm Logout
              </AlertDialogTitle>
              <AlertDialogDescription className="text-red-100/90">
                Are you sure you want to logout? You will need to sign in again to access the dashboard.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter className="gap-3 p-6 bg-slate-900">
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-200">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-500 text-white transition-all duration-200"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
