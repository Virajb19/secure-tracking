'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Eye, X, Calendar, Building2, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Notice } from '@/services/notices.service';

interface ViewNoticeButtonProps {
  notice: Notice;
}

export function ViewNoticeButton({ notice }: ViewNoticeButtonProps) {
  const [showDialog, setShowDialog] = useState(false);

  const priorityStyles = {
    HIGH: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
    NORMAL: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
    LOW: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <>
      <motion.button
        onClick={() => setShowDialog(true)}
        className="p-2 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-400/10 rounded-lg transition-all"
        title="View Notice"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Eye className="h-5 w-5" />
      </motion.button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 rounded-2xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white text-xl font-semibold flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg">
                  <Eye className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                Notice Details
              </div>
              <Badge className={priorityStyles[notice.priority]}>
                {notice.priority} Priority
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Title */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {notice.title}
              </h3>
            </div>

            {/* Content */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700/50">
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {notice.content}
              </p>
            </div>

            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-4">
              {notice.school && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm">{notice.school.name}</span>
                </div>
              )}
              
              {notice.creator && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <User className="h-4 w-4" />
                  <span className="text-sm">{notice.creator.name}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Created: {formatDate(notice.created_at)}</span>
              </div>

              {notice.expires_at && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Expires: {formatDate(notice.expires_at)}</span>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700/50">
              <span className="text-sm text-slate-500 dark:text-slate-400">Status</span>
              <Badge className={notice.is_active 
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                : 'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400'
              }>
                {notice.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
