'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Calendar, Building2, FileText, ExternalLink, Tag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { getFileURL } from '@/lib/appwrite';
import type { Notice } from '@/services/notices.service';

interface ViewNoticeButtonProps {
  notice: Notice;
}

const typeStyles: Record<string, string> = {
  'General': 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  'Paper Setter': 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
  'Paper Checker': 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
  'Invitation': 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  'Push Notification': 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
};

export function ViewNoticeButton({ notice }: ViewNoticeButtonProps) {
  const [showDialog, setShowDialog] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const hasFile = Boolean(notice.file_url);

  const handleViewFile = () => {
    if (notice.file_url) {
      // Use Appwrite getFileURL to generate proper view URL from file key
      const fileUrl = getFileURL(notice.file_url);
      window.open(fileUrl.toString(), '_blank');
    }
  };

  return (
    <>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={hasFile ? handleViewFile : undefined}
              className={`p-2 rounded-lg transition-all ${
                hasFile 
                  ? 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-400/10 cursor-pointer' 
                  : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
              }`}
              whileHover={hasFile ? { scale: 1.1 } : {}}
              whileTap={hasFile ? { scale: 0.9 } : {}}
              disabled={!hasFile}
            >
              <Eye className="h-5 w-5" />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{hasFile ? 'View File' : 'No file available'}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={() => setShowDialog(true)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-400/10 rounded-lg transition-all"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <FileText className="h-5 w-5" />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>
            <p>View Details</p>
          </TooltipContent>
        </Tooltip>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 rounded-2xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white text-xl font-semibold flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg">
                  <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                Notice Details
              </div>
              <Badge className={typeStyles[notice.type] || typeStyles['General']}>
                {notice.type || 'General'}
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

              {notice.subject && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Tag className="h-4 w-4" />
                  <span className="text-sm">Subject: {notice.subject}</span>
                </div>
              )}

              {notice.venue && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm">Venue: {notice.venue}</span>
                </div>
              )}
            </div>

            {/* File Section */}
            {notice.file_url && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700/50">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{notice.file_name || 'Attached File'}</span>
                </div>
                <motion.button
                  onClick={handleViewFile}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open File
                </motion.button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
