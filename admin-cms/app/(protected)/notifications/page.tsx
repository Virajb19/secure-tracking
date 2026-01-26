'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Bell, Eye, Loader2, FileText, Calendar, User, Building2 } from 'lucide-react';
import { DeleteNotificationButton } from '@/components/DeleteNotificationButton';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const tableRowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.03,
      duration: 0.3
    }
  }),
  hover: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    transition: { duration: 0.2 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3 }
  }
};

// Dummy data for notifications
const dummyNotifications = [
  {
    id: '1',
    fullName: 'kieca',
    message: 'Training on NBSE Connect App',
    school: 'Dummy School (For Testing Purposes) - Chumukedima',
    date: '21st January, 2026',
    fileUrl: '#',
  },
  {
    id: '2',
    fullName: 'Ruchu',
    message: 'Training on NBSE Connect App',
    school: 'Dummy School (For Testing Purposes) - Chumukedima',
    date: '21st January, 2026',
    fileUrl: '#',
  },
  {
    id: '3',
    fullName: 'akhrie',
    message: 'Training on NBSE Connect App',
    school: 'Dummy School (For Testing Purposes) - Chumukedima',
    date: '21st January, 2026',
    fileUrl: '#',
  },
  {
    id: '4',
    fullName: 'Araile',
    message: 'Training on NBSE Connect App',
    school: 'Dummy School (For Testing Purposes) - Chumukedima',
    date: '21st January, 2026',
    fileUrl: '#',
  },
  {
    id: '5',
    fullName: 'Siduniu Rentta',
    message: 'Training on NBSE Connect App',
    school: 'Dummy School (For Testing Purposes) - Chumukedima',
    date: '21st January, 2026',
    fileUrl: '#',
  },
  {
    id: '6',
    fullName: 'Dziesevolie Tsurho',
    message: 'Training on NBSE Connect App',
    school: 'Dummy School (For Testing Purposes) - Chumukedima',
    date: '21st January, 2026',
    fileUrl: '#',
  },
  {
    id: '7',
    fullName: 'thungdemo',
    message: 'Training on NBSE Connect App',
    school: 'Dummy School (For Testing Purposes) - Chumukedima',
    date: '21st January, 2026',
    fileUrl: '#',
  },
  {
    id: '8',
    fullName: 'Akumla Longchar',
    message: 'System Update Notification',
    school: 'Govt. High School - Mokokchung',
    date: '20th January, 2026',
    fileUrl: '#',
  },
];

const notificationTypes = [
  { value: 'all', label: 'All Notifications' },
  { value: 'Training on NBSE Connect App', label: 'Training on NBSE Connect App' },
  { value: 'System Update Notification', label: 'System Update Notification' },
  { value: 'Exam Schedule Alert', label: 'Exam Schedule Alert' },
  { value: 'Holiday Announcement', label: 'Holiday Announcement' },
];

export default function NotificationsPage() {
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState(dummyNotifications);
  const [isLoading] = useState(false);

  const handleDelete = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const handleViewFile = (fileUrl: string) => {
    console.log('Viewing file:', fileUrl);
    // Open file in new tab or modal
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const matchesType = selectedType === 'all' || n.message === selectedType;
      const matchesSearch = searchQuery === '' || 
        n.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.school.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [notifications, selectedType, searchQuery]);

  // Stats
  const totalCount = notifications.length;
  const trainingCount = notifications.filter(n => n.message.includes('Training')).length;
  const systemCount = notifications.filter(n => n.message.includes('System')).length;

  if (isLoading) {
    return (
      <motion.div 
        className="space-y-8 p-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Notifications</h1>
          </div>
        </motion.div>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="h-10 w-10 text-blue-500" />
          </motion.div>
          <span className="text-slate-400">Loading notifications...</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-8 p-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bell className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-white">General Notifications</h1>
              <p className="text-slate-400 text-sm">View and manage all system notifications</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/20 px-3 py-1">
              {trainingCount} Training
            </Badge>
            <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/20 px-3 py-1">
              {systemCount} System
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/20 px-3 py-1">
              {totalCount} Total
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div 
        className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 p-6 shadow-xl"
        variants={cardVariants}
      >
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-slate-400 text-sm mb-2 flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search Notifications
            </label>
            <Input
              placeholder="Search by name, school..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>

          <div className="min-w-[250px]">
            <label className="text-slate-400 text-sm mb-2 block">Notification Type</label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                <SelectValue placeholder="All Notifications" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {notificationTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="text-white hover:bg-slate-700">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* Notifications Table */}
      <motion.div 
        className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl"
        variants={cardVariants}
      >
        {filteredNotifications.length === 0 ? (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Bell className="h-16 w-16 text-slate-700 mx-auto mb-4" />
            <div className="text-slate-400 text-lg">No notifications found</div>
            <p className="text-slate-500 text-sm mt-2">Try adjusting your filters</p>
          </motion.div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-700">
                  <th className="text-left py-4 px-5 text-slate-400 font-medium text-sm">Sl No.</th>
                  <th className="text-left py-4 px-5 text-slate-400 font-medium text-sm">
                    <User className="h-4 w-4 inline mr-1" />
                    Full Name
                  </th>
                  <th className="text-left py-4 px-5 text-slate-400 font-medium text-sm">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Message
                  </th>
                  <th className="text-left py-4 px-5 text-slate-400 font-medium text-sm">
                    <Building2 className="h-4 w-4 inline mr-1" />
                    School
                  </th>
                  <th className="text-left py-4 px-5 text-slate-400 font-medium text-sm">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Date
                  </th>
                  <th className="text-left py-4 px-5 text-slate-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredNotifications.map((notification, index) => (
                    <motion.tr 
                      key={notification.id}
                      custom={index}
                      variants={tableRowVariants}
                      initial="hidden"
                      animate="visible"
                      whileHover="hover"
                      className="border-b border-slate-800/50"
                    >
                      <td className="py-4 px-5 text-slate-400 font-mono text-sm">{index + 1}</td>
                      <td className="py-4 px-5">
                        <span className="text-blue-400 font-medium">{notification.fullName}</span>
                      </td>
                      <td className="py-4 px-5">
                        <Badge className={
                          notification.message.includes('Training') 
                            ? 'bg-amber-500/20 text-amber-400' 
                            : notification.message.includes('System')
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }>
                          {notification.message}
                        </Badge>
                      </td>
                      <td className="py-4 px-5 text-slate-300 max-w-[250px] truncate" title={notification.school}>
                        {notification.school}
                      </td>
                      <td className="py-4 px-5 text-slate-400">{notification.date}</td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <motion.button
                            onClick={() => handleViewFile(notification.fileUrl)}
                            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all"
                            title="View File"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Eye className="h-5 w-5" />
                          </motion.button>
                          <motion.button
                            onClick={() => setDeleteConfirmId(notification.id)}
                            disabled={deletingId === notification.id}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all disabled:opacity-50"
                            title="Delete"
                            whileHover={{ scale: deletingId === notification.id ? 1 : 1.1 }}
                            whileTap={{ scale: deletingId === notification.id ? 1 : 0.9 }}
                          >
                            {deletingId === notification.id ? (
                              <div className='size-5 border-2 border-t-[3px] border-white/20 border-t-red-600 rounded-full animate-spin'/>
                            ) : (
                              <Trash2 className="h-5 w-5" />
                            )}
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
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
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-red-600 hover:bg-red-700 text-white transition-all duration-200"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

