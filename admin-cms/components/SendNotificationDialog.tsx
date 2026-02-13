'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell, Upload, Send, Sparkles, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { uploadFile } from '@/lib/appwrite';
import {
  sendNotificationSchema,
  type SendNotificationSchema,
  type NotificationType,
  notificationTypes,
} from '@/lib/zod';
import noticesApi from '@/services/notices.service';
import { masterDataApi } from '@/services/api';
import { paperSetterApi } from '@/services/paper-setter.service';
import { showSuccessToast } from './ui/custom-toast';
import { User } from '@/types';

interface SendNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientUserIds: string[];
  selectedUsers?: User[]; // Pass selected users data to extract teaching assignments
  singleUser?: boolean;
}

// Subjects are now fetched from the database via API

export function SendNotificationDialog({
  open,
  onOpenChange,
  recipientUserIds,
  selectedUsers = [],
  singleUser = false,
}: SendNotificationDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<NotificationType>('General');
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [duplicateWarnings, setDuplicateWarnings] = useState<Array<{
    schoolName: string;
    teacherName: string;
    status: string;
  }>>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // Fetch subjects from master data
  const { data: subjectsData, isLoading: subjectsLoading, error: subjectsError } = useQuery<string[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      try {
        const data = await masterDataApi.getSubjects();
        return data;
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  // Compute class levels from selected users' teaching assignments
  // If multiple users: show only overlapping (common) classes
  // If single user: show all their classes
  const isPaperSetterOrChecker = selectedType === 'Paper Setter' || selectedType === 'Paper Checker';

  const userClassLevels = useMemo(() => {
    if (!isPaperSetterOrChecker || selectedUsers.length === 0) return [];

    // Get class levels for each user
    const classLevelsPerUser = selectedUsers.map(user => {
      const assignments = user.faculty?.teaching_assignments || [];
      return [...new Set(assignments.map(ta => ta.class_level))];
    });

    // If no users have teaching assignments, return empty
    if (classLevelsPerUser.every(levels => levels.length === 0)) return [];

    // Filter out users without teaching assignments for intersection calculation
    const usersWithClasses = classLevelsPerUser.filter(levels => levels.length > 0);

    if (usersWithClasses.length === 0) return [];

    // Find common (overlapping) class levels across all selected users
    // Start with first user's classes and intersect with others
    let commonClasses = usersWithClasses[0];
    for (let i = 1; i < usersWithClasses.length; i++) {
      commonClasses = commonClasses.filter(level => usersWithClasses[i].includes(level));
    }

    return commonClasses.sort((a, b) => a - b);
  }, [selectedUsers, isPaperSetterOrChecker]);

  const subjects = subjectsData || [];

  const getDefaultValues = (type: NotificationType): SendNotificationSchema => {
    switch (type) {
      case 'General':
        return { type: 'General', message: '', file: undefined };
      case 'Paper Setter':
        return { type: 'Paper Setter', subject: '', classLevel: 10, message: '', file: undefined };
      case 'Paper Checker':
        return { type: 'Paper Checker', subject: '', classLevel: 10, message: '', file: undefined };
      case 'Invitation':
        return { type: 'Invitation', heading: '', venue: '', eventTime: '', eventDate: '', file: undefined };
      case 'Push Notification':
        return { type: 'Push Notification', title: '', message: '', file: undefined };
      default:
        return { type: 'General', message: '', file: undefined };
    }
  };

  const form = useForm<SendNotificationSchema>({
    resolver: zodResolver(sendNotificationSchema),
    defaultValues: getDefaultValues('General'),
  });

  const selectedFile = form.watch('file');

  // Reset form when type changes
  useEffect(() => {
    form.reset(getDefaultValues(selectedType));
    setDuplicateWarnings([]); // Clear warnings when type changes
  }, [selectedType, form]);

  // Watch subject and classLevel for duplicate checking
  const watchedSubject = form.watch('subject');
  const watchedClassLevel = form.watch('classLevel');

  // Check for duplicate selections when Paper Setter/Checker is selected
  useEffect(() => {
    const checkDuplicates = async () => {
      if (!isPaperSetterOrChecker || !watchedSubject || !watchedClassLevel || selectedUsers.length === 0) {
        setDuplicateWarnings([]);
        return;
      }

      setCheckingDuplicates(true);
      const warnings: Array<{ schoolName: string; teacherName: string; status: string }> = [];

      // Check each selected user's school for duplicates
      for (const user of selectedUsers) {
        const schoolId = user.faculty?.school?.id;
        const schoolName = user.faculty?.school?.name || 'Unknown School';
        if (!schoolId) continue;

        try {
          const result = await paperSetterApi.checkDuplicateSelection({
            schoolId,
            subject: watchedSubject,
            classLevel: watchedClassLevel,
            selectionType: selectedType === 'Paper Setter' ? 'PAPER_SETTER' : 'EXAMINER',
          });

          if (result.hasDuplicate) {
            result.existingSelections.forEach(sel => {
              warnings.push({
                schoolName,
                teacherName: sel.teacherName,
                status: sel.status,
              });
            });
          }
        } catch (error) {
          console.error('Failed to check duplicates for school:', schoolId, error);
        }
      }

      setDuplicateWarnings(warnings);
      setCheckingDuplicates(false);
    };

    // Debounce the check
    const timeoutId = setTimeout(checkDuplicates, 300);
    return () => clearTimeout(timeoutId);
  }, [isPaperSetterOrChecker, watchedSubject, watchedClassLevel, selectedUsers, selectedType]);

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
          throw new Error('File upload failed. Notice not sent.');
        } finally {
          setUploadingFile(false);
        }
      }

      // Map display type names to backend enum values
      const typeToEnumMap: Record<NotificationType, string> = {
        'General': 'GENERAL',
        'Paper Setter': 'PAPER_SETTER',
        'Paper Checker': 'PAPER_CHECKER',
        'Invitation': 'INVITATION',
        'Push Notification': 'PUSH_NOTIFICATION',
      };

      // Build payload based on type
      let payload: any = {
        user_ids: recipientUserIds,
        type: typeToEnumMap[data.type],
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
      };

      switch (data.type) {
        case 'General':
          payload.title = 'General Notice';
          payload.message = data.message;
          break;
        case 'Paper Setter':
          payload.title = `Paper Setter - ${data.subject}`;
          payload.message = data.message;
          payload.subject = data.subject;
          payload.class_level = data.classLevel;
          break;
        case 'Paper Checker':
          payload.title = `Paper Checker - ${data.subject}`;
          payload.message = data.message;
          payload.subject = data.subject;
          payload.class_level = data.classLevel;
          break;
        case 'Invitation':
          payload.title = 'Invitation';
          payload.message = data.heading;
          payload.venue = data.venue;
          payload.event_time = data.eventTime;
          payload.event_date = data.eventDate;
          break;
        case 'Push Notification':
          payload.title = data.title;
          payload.message = data.message;
          break;
      }

      const response = await noticesApi.sendNotice(payload);
      return response;
    },
    onSuccess: (data) => {
      showSuccessToast(data.message || 'Notice sent successfully!');
      queryClient.refetchQueries({ queryKey: ['notices'] });
      // Also refresh paper-setter selections if type was Paper Setter/Checker
      queryClient.invalidateQueries({ queryKey: ['paper-setter-selections'] });
      handleClose();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Failed to send notice';
      toast.error(message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      queryClient.invalidateQueries({ queryKey: ['paper-setter-selections'] });
    }
  });

  const handleClose = () => {
    form.reset(getDefaultValues('General'));
    setSelectedType('General');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  const onSubmit = async (data: SendNotificationSchema) => {
    await sendNoticeMutation.mutateAsync(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: File | undefined) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange(file);
      form.trigger('file');
    }
  };

  const removeFile = (onChange: (value: File | undefined) => void) => {
    onChange(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTypeChange = (type: NotificationType) => {
    setSelectedType(type);
    form.setValue('type', type);
  };

  const isSubmitting = sendNoticeMutation.isPending || uploadingFile;

  // Render form fields based on selected type
  const renderFormFields = () => {
    switch (selectedType) {
      case 'General':
        return (
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-700 dark:text-slate-300">Message</FormLabel>
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
        );

      case 'Paper Setter':
      case 'Paper Checker':
        return (
          <>
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 dark:text-slate-300">Subject</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-blue-500/20 h-11">
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 z-9999 max-h-60">
                      {subjects.map((subject) => (
                        <SelectItem
                          key={subject}
                          value={subject}
                          className="text-slate-900 dark:text-white cursor-pointer"
                        >
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="classLevel"
              render={({ field }) => {
                // Use selected users' class levels, fallback to default 10, 12 if none
                const classLevelOptions = userClassLevels.length > 0
                  ? userClassLevels
                  : [10, 12];

                return (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300">Class Level</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-blue-500/20 h-11">
                          <SelectValue placeholder="Select a class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 z-9999">
                        {classLevelOptions.map((level) => (
                          <SelectItem
                            key={level}
                            value={level.toString()}
                            className="text-slate-900 dark:text-white cursor-pointer"
                          >
                            Class {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedUsers.length > 0 && userClassLevels.length === 0 && (
                      <p className="text-xs text-amber-500 dark:text-amber-400 mt-1">
                        {selectedUsers.length > 1
                          ? 'No common classes found across selected teachers'
                          : 'No teaching assignments found for this teacher'}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 dark:text-slate-300">Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Type your message here..."
                      {...field}
                      className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 min-h-[100px] focus:border-blue-500 focus:ring-blue-500/20 transition-all resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Duplicate Warning Banner */}
            {duplicateWarnings.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-3 mt-2">
                <div className="flex items-start gap-2">
                  <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Warning: Existing {selectedType} Found
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      The following school(s) already have a {selectedType.toLowerCase()} for this subject:
                    </p>
                    <ul className="text-xs text-amber-600 dark:text-amber-400 mt-2 space-y-1">
                      {duplicateWarnings.map((warning, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                          <span className="font-medium">{warning.schoolName}</span>
                          <span>- {warning.teacherName}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${warning.status === 'ACCEPTED'
                            ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                            }`}>
                            {warning.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-2 italic">
                      You can still proceed - this is just a warning.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {checkingDuplicates && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking for existing selections...
              </div>
            )}
          </>
        );

      case 'Invitation':
        return (
          <>
            <FormField
              control={form.control}
              name="heading"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 dark:text-slate-300">Heading / Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter invitation heading or message..."
                      {...field}
                      className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 min-h-[80px] focus:border-blue-500 focus:ring-blue-500/20 transition-all resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 dark:text-slate-300">Venue</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter venue"
                      {...field}
                      className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 h-11 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="eventTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300">Event Time</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white h-11 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300">Event Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white h-11 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        );

      case 'Push Notification':
        return (
          <>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 dark:text-slate-300">Subject / Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter notification title"
                      {...field}
                      className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 h-11 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 dark:text-slate-300">Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Type your message here..."
                      {...field}
                      className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 min-h-[100px] focus:border-blue-500 focus:ring-blue-500/20 transition-all resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white max-w-lg max-h-[90vh] overflow-y-auto duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <Bell className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">Send Notification</DialogTitle>
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
            {/* Notification Type Toggle Buttons */}
            <div className="mt-4">
              <label className="text-slate-600 dark:text-slate-300 text-sm mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                Notification Type
              </label>
              <div className="flex flex-wrap gap-2">
                {notificationTypes.map((type) => (
                  <motion.button
                    key={type}
                    type="button"
                    onClick={() => handleTypeChange(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${selectedType === type
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
            </div>

            {/* Dynamic Form Fields */}
            <div className="space-y-4 pt-2">
              {renderFormFields()}
            </div>

            {/* File Upload */}
            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormControl>
                    <div>
                      {selectedFile ? (
                        <div className="flex items-center gap-3 h-12 px-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/50">
                          <Upload className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-sm truncate flex-1 text-emerald-700 dark:text-emerald-400">
                            {selectedFile.name}
                          </span>
                          <span className="text-xs bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFile(onChange)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-full transition-colors"
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      ) : (
                        <motion.label
                          className="flex items-center gap-3 h-12 px-4 rounded-lg cursor-pointer transition-all border bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500"
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <Upload className="h-5 w-5" />
                          <span className="text-sm truncate flex-1">
                            Select File (Only Image/PDF allowed)
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
                  disabled={form.formState.isSubmitting || uploadingFile}
                  className="w-full bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50"
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
