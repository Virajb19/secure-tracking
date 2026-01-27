'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Bell, Upload, Send, Sparkles, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { uploadFile } from '@/lib/appwrite';
import { 
  sendNotificationSchema, 
  type SendNotificationSchema, 
  notificationTypes,
} from '@/lib/zod';
import noticesApi from '@/services/notices.service';

interface SendNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientUserIds: string[];
  singleUser?: boolean;
}

export function SendNotificationDialog({
  open,
  onOpenChange,
  recipientUserIds,
  singleUser = false,
}: SendNotificationDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<SendNotificationSchema>({
    resolver: zodResolver(sendNotificationSchema),
    defaultValues: {
      type: 'General',
      message: '',
      file: undefined,
    },
  });

  const [uploadingFile, setUploadingFile] = useState<boolean>(false);

  const selectedFile = form.watch('file');

  const queryClient = useQueryClient();

  const sendNoticeMutation = useMutation({
    mutationFn: async (data: SendNotificationSchema) => {
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      let fileSize: number | undefined;

      // Upload file to Appwrite if selected
      if (data.file) {
        try {
            setUploadingFile(true);
            fileSize = data.file.size;

            const result = await uploadFile(data.file);
            fileUrl = result.fileKey;
            fileName = result.fileName;

          } catch (err: any) {
            toast.error('File upload failed');
            form.setError('file', { type: 'manual', message: 'File upload failed' });

            // IMPORTANT: stop mutation completely
            throw new Error('File upload failed. Notice not sent.');
          } finally {
            setUploadingFile(false);
          }
      }

      // Send notice via service
      const response = await noticesApi.sendNotice({
        user_ids: recipientUserIds,
        title: data.type, // Use type as title
        message: data.message,
        type: data.type,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
      });

      return response;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Notice sent successfully!');
      queryClient.refetchQueries({ queryKey: ['notices'] });
      handleClose();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Failed to send notice';
      toast.error(message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
    }
  });

  const handleClose = () => {
    form.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  const onSubmit = async (data: SendNotificationSchema) => {
    sendNoticeMutation.mutate(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: File | undefined) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange(file);
      // Trigger validation manually
      form.trigger('file');
    }
  };

  const removeFile = (onChange: (value: File | undefined) => void) => {
    onChange(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isSubmitting = sendNoticeMutation.isPending || uploadingFile;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <Bell className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">Send Notice</DialogTitle>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Send a notification to{' '}
                <span className="bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full text-xs font-medium">
                  {singleUser ? '1 user' : `${recipientUserIds.length} users`}
                </span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Notification Type Buttons */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <div className="mt-6">
                    <label className="text-slate-600 dark:text-slate-300 text-sm mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      Notification Type
                    </label>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {notificationTypes.map((type) => (
                          <motion.button
                            key={type}
                            type="button"
                            onClick={() => field.onChange(type)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                              field.value === type 
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20' 
                                : 'bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50'
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            layout
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          >
                            {type}
                          </motion.button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            {/* Message Textarea */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <label className="text-slate-600 dark:text-slate-300 text-sm mb-2 block">Message</label>
                  <FormControl>
                    <Textarea
                      placeholder="Type your notification message here..."
                      {...field}
                      className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 min-h-[120px] focus:border-blue-500 focus:ring-blue-500/20 transition-all resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload with FormField */}
            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <label className="text-slate-600 dark:text-slate-300 text-sm mb-2 block">Attachment (Optional)</label>
                  <FormControl>
                    <div>
                      {selectedFile ? (
                        <div className="flex items-center gap-3 h-12 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/50">
                          <Upload className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                          <span className="text-sm truncate flex-1 text-emerald-600 dark:text-emerald-400">
                            {selectedFile.name}
                          </span>
                          <span className="text-xs bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFile(onChange)}
                            className="p-1 hover:bg-red-500/20 rounded-full transition-colors"
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      ) : (
                        <motion.label 
                          className="flex items-center gap-3 h-12 px-4 rounded-lg cursor-pointer transition-all border bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:border-slate-400 dark:hover:border-slate-500"
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <Upload className="h-5 w-5" />
                          <span className="text-sm truncate flex-1">
                            Select File (Only PNG, JPG, or PDF - Max 5MB)
                          </span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,application/pdf"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, onChange)}
                          />
                        </motion.label>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6 gap-3">
              <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={form.formState.isSubmitting}
                  className="w-full bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </Button>
              </motion.div>
              <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {uploadingFile ? 'Uploading File...' : 'Sending Notification...'}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Notification
                    </>
                  )}
                </Button>
              </motion.div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
