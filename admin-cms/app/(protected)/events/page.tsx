'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { RetryButton } from '@/components/RetryButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Calendar, MapPin, Users, Eye, Trash2, Loader2, Check, X, Clock, CalendarDays, Search, Download, FileText, User } from 'lucide-react';
import { useGetEvents, useDeleteEvent, useGetEventById } from '@/services/events.service';
import { useGetDistricts } from '@/services/user.service';
import { showSuccessToast, showErrorToast } from '@/components/ui/custom-toast';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import { EventFilterParams, SchoolEventType, EventWithStats } from '@/services/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useDebounceCallback } from 'usehooks-ts';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

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
      delay: i * 0.05,
      duration: 0.3,
      ease: 'easeOut' as const
    }
  }),
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.2 }
  },
  hover: {
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
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

const eventTypeLabels: Record<SchoolEventType, string> = {
  MEETING: 'Meeting',
  EXAM: 'Exam',
  HOLIDAY: 'Holiday',
  SEMINAR: 'Seminar',
  WORKSHOP: 'Workshop',
  SPORTS: 'Sports',
  CULTURAL: 'Cultural',
  OTHER: 'Other',
};

const eventTypeColors: Record<SchoolEventType, string> = {
  MEETING: 'bg-blue-500/20 text-blue-400',
  EXAM: 'bg-red-500/20 text-red-400',
  HOLIDAY: 'bg-green-500/20 text-green-400',
  SEMINAR: 'bg-orange-500/20 text-orange-400',
  WORKSHOP: 'bg-cyan-500/20 text-cyan-400',
  SPORTS: 'bg-yellow-500/20 text-yellow-400',
  CULTURAL: 'bg-pink-500/20 text-pink-400',
  OTHER: 'bg-purple-500/20 text-purple-400',
};

export default function EventsPage() {
  const { data: districts = [] } = useGetDistricts();
  const deleteEventMutation = useDeleteEvent();

  // Date filters - default to all time (empty means no filter)
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  
  // Pagination state
  const [allEvents, setAllEvents] = useState<EventWithStats[]>([]);
  const [offset, setOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageSize = 20;

  const [isDownloading, setIsDownloading] = useState(false);

  // Build filters for API
  const apiFilters: EventFilterParams = useMemo(() => {
    const filters: EventFilterParams = {};
    if (fromDate) filters.from_date = fromDate;
    if (toDate) filters.to_date = toDate;
    if (districtFilter && districtFilter !== 'all') filters.district_id = districtFilter;
    if (eventTypeFilter && eventTypeFilter !== 'all') filters.event_type = eventTypeFilter as SchoolEventType;
    return filters;
  }, [fromDate, toDate, districtFilter, eventTypeFilter]);

  const { data, isLoading, isError, isFetching } = useGetEvents(apiFilters, pageSize, offset);

  // Update allEvents when data changes
  useEffect(() => {
    if (data) {
      if (offset === 0) {
        setAllEvents(data.data);
      } else {
        setAllEvents(prev => {
          const existingIds = new Set(prev.map(e => e.id));
          const newEvents = data.data.filter(e => !existingIds.has(e.id));
          return [...prev, ...newEvents];
        });
      }
      setIsLoadingMore(false);
    }
  }, [data, offset]);

  // Reset when filters change
  useEffect(() => {
    setOffset(0);
    setAllEvents([]);
  }, [fromDate, toDate, districtFilter, eventTypeFilter]);

  const loadMore = () => {
    if (!isFetching && !isLoadingMore && data?.hasMore) {
      setIsLoadingMore(true);
      setOffset(prev => prev + pageSize);
    }
  };

  // Search filter (client-side)
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Debounce the search
  const debouncedSetSearch = useDebounceCallback(setSearchQuery, 500);

  // Modals
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Get event details when viewing
  const { data: eventDetails, isLoading: isLoadingDetails } = useGetEventById(selectedEventId || undefined);

  // Filter events by search (client-side)
  const filteredEvents = useMemo(() => {
    if (!searchQuery) return allEvents;
    return allEvents.filter(event => {
      return event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.creator?.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [allEvents, searchQuery]);

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEventMutation.mutateAsync(eventId);
      showSuccessToast('Event deleted successfully');
    } catch (error: any) {
      showErrorToast(error?.response?.data?.message || 'Failed to delete event');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateLong = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Download PDF function
  const handleDownloadPDF = () => {
    try {
      setIsDownloading(true);

      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.setTextColor(33, 37, 41);
      doc.text('Events Report', 14, 22);
      
      // Subtitle with filters
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      
      // Build filter text - handle empty dates gracefully
      const filterParts: string[] = [];
      if (fromDate) filterParts.push(`From: ${formatDate(fromDate)}`);
      if (toDate) filterParts.push(`To: ${formatDate(toDate)}`);
      if (!fromDate && !toDate) filterParts.push('All dates');
      if (districtFilter !== 'all') {
        const district = districts.find(d => d.id === districtFilter);
        filterParts.push(`District: ${district?.name || districtFilter}`);
      }
      if (eventTypeFilter !== 'all') {
        filterParts.push(`Type: ${eventTypeLabels[eventTypeFilter as SchoolEventType] || eventTypeFilter}`);
      }
      
      doc.text(filterParts.join(' | '), 14, 30);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 36);
      
      // Table
      const tableData = filteredEvents.map((event, index) => [
        index + 1,
        event.title,
        eventTypeLabels[event.event_type as SchoolEventType] || event.event_type,
        formatDate(event.event_date),
        event.location || '-',
        event.creator?.name || '-',
        `${event.male_participants || 0}M / ${event.female_participants || 0}F`,
      ]);
      
      doc.autoTable({
        head: [['#', 'Event Name', 'Type', 'Date', 'Venue', 'Created By', 'Participants']],
        body: tableData,
        startY: 42,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] },
      });
      
      // Build filename
      const datePart = fromDate && toDate ? `${fromDate}-to-${toDate}` : new Date().toISOString().split('T')[0];
      doc.save(`events-report-${datePart}.pdf`);
      showSuccessToast('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      showErrorToast('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <motion.div 
        className="space-y-8 p-2"
        variants={containerVariants}
        initial={false}
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Events</h1>
          </div>
        </motion.div>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="h-10 w-10 text-blue-500" />
          </motion.div>
          <span className="text-slate-400">Loading events...</span>
        </div>
      </motion.div>
    );
  }

  if (isError) {
    return (
      <motion.div 
        className="space-y-8 p-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Events</h1>
          </div>
        </motion.div>
        <motion.div 
          className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center"
          variants={cardVariants}
        >
          <RetryButton queryKey={['events', apiFilters, pageSize, offset]} message="Failed to load events" />
        </motion.div>
      </motion.div>
    );
  }

  const upcomingCount = allEvents.filter(e => new Date(e.event_date) >= new Date()).length;
  const pastCount = allEvents.filter(e => new Date(e.event_date) < new Date()).length;

  return (
    <motion.div 
      className="space-y-8 p-2"
      variants={containerVariants}
      initial={false}
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2 bg-linear-to-br from-indigo-500 to-purple-600 rounded-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <CalendarDays className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Events</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Manage meetings, exams, and other events</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 px-3 py-1">
              {upcomingCount} Upcoming
            </Badge>
            <Badge className="bg-slate-700/50 text-slate-300 hover:bg-slate-700/50 px-3 py-1">
              {pastCount} Past
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/20 px-3 py-1">
              {data?.total || allEvents.length} Total
            </Badge>
            <RefreshTableButton queryKey={['events', apiFilters, pageSize, offset]} isFetching={isFetching} />
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div 
        className="bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-xl"
        variants={cardVariants}
      >
        <div className="flex flex-wrap gap-4 items-end">
          {/* Date Range */}
          <div className="min-w-[180px]">
            <label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">From Date</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-blue-500/50 text-slate-900 dark:text-white"
            />
          </div>
          
          <div className="min-w-[180px]">
            <label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">To Date</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-blue-500/50 text-slate-900 dark:text-white"
            />
          </div>

          {/* District Filter */}
          <div className="min-w-[180px]">
            <label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">District</label>
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-blue-500/50 text-slate-900 dark:text-white">
                <SelectValue placeholder="All Districts" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white hover:bg-slate-700">All Districts</SelectItem>
                {districts.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-white hover:bg-slate-700">{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Event Type Filter */}
          <div className="min-w-[160px]">
            <label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Event Type</label>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-blue-500/50 text-slate-900 dark:text-white">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white hover:bg-slate-700">All Types</SelectItem>
                {Object.entries(eventTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-white hover:bg-slate-700">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-slate-500 dark:text-slate-400 text-sm mb-2 flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search Events
            </label>
            <Input
              placeholder="Search by title, location..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                debouncedSetSearch(e.target.value);
              }}
              className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-blue-500/50 text-slate-900 dark:text-white placeholder:text-slate-500"
            />
          </div>

          {/* Download PDF Button */}
          <Button
            onClick={handleDownloadPDF}
            className="bg-green-600 group hover:bg-green-700 text-white flex items-center gap-2"
            disabled={isDownloading || filteredEvents.length === 0}
          >
             {isDownloading ? (
                   <>
                      <div className='size-5 border-2 border-white/30 border-t-[3px] border-t-white animate-spin rounded-full disabled:opacity-80'/>
                      Downloading...
                   </>              
            ) : (
              <>
                 <Download className="h-5 w-5 group-hover:-translate-y-1 group-hover:scale-110 transition-transform disabled:cursor-not-allowed" />
                 Download PDF
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Events Table */}
      <motion.div 
        className="bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-xl"
        variants={cardVariants}
      >
        <div className="overflow-x-auto relative">
          {/* Inline loader when refetching with existing data */}
          {isFetching && allEvents.length > 0 && !isLoadingMore && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-3 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">Refreshing...</span>
              </div>
            </div>
          )}
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">Sl. No.</th>
                <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">Photo</th>
                <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">Event Name</th>
                <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">Created By</th>
                <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Date
                </th>
                <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Venue
                </th>
                <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">Action</th>
              </tr>
            </thead>
            <tbody>
              {(isLoading || isFetching) && allEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 className="h-10 w-10 text-blue-500" />
                      </motion.div>
                      <span className="text-slate-400">Loading events...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16">
                    <motion.div 
                      className="text-center"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <CalendarDays className="h-16 w-16 text-slate-400 dark:text-slate-700 mx-auto mb-4" />
                      <div className="text-slate-500 dark:text-slate-400 text-lg">No events found</div>
                      <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Try adjusting your filters</p>
                    </motion.div>
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredEvents.map((event, index) => (
                    <motion.tr 
                      key={event.id}
                      custom={index}
                      variants={tableRowVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      whileHover="hover"
                      layout
                      className="border-b border-slate-100 dark:border-slate-800/50"
                    >
                      <td className="py-4 px-5 text-slate-700 dark:text-slate-300">
                        {index + 1}
                      </td>
                      <td className="py-4 px-5">
                        {event.flyer_url ? (
                          <img 
                            src={event.flyer_url} 
                            alt={event.title}
                            className="w-16 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-16 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <p className="text-slate-900 dark:text-white font-medium">{event.title}</p>
                        <Badge className={`${eventTypeColors[event.event_type as SchoolEventType] || eventTypeColors.OTHER} mt-1`}>
                          {eventTypeLabels[event.event_type as SchoolEventType] || event.event_type}
                        </Badge>
                      </td>
                      <td className="py-4 px-5 text-slate-700 dark:text-slate-300">
                        {event.creator?.name || 'Admin'}
                      </td>
                      <td className="py-4 px-5 text-slate-700 dark:text-slate-300">
                        {formatDate(event.event_date)}
                      </td>
                      <td className="py-4 px-5 text-slate-700 dark:text-slate-300">
                        {event.location || '-'}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <motion.button
                            onClick={() => {
                              setSelectedEventId(event.id);
                              setViewModalOpen(true);
                            }}
                            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-full text-sm font-medium transition-all"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            View
                          </motion.button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <motion.button
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                title="Delete"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Trash2 className="h-5 w-5" />
                              </motion.button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-900 border-slate-700/50 rounded-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white text-lg font-semibold">Delete Event</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">
                                  Are you sure you want to delete "{event.title}"? 
                                  <br />
                                  <span className="text-red-400 font-medium">This action cannot be undone.</span>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-3 mt-4">
                                <AlertDialogCancel className="bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white transition-all duration-200">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteEvent(event.id)}
                                  className="bg-red-600 text-white hover:bg-red-700 transition-all duration-200"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Load More / Status */}
        {allEvents.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50">
            {(isFetching || isLoadingMore) && offset > 0 ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                <span className="text-slate-400 text-sm">Loading more...</span>
              </div>
            ) : data?.hasMore ? (
              <div className="flex justify-center">
                <Button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  variant="outline"
                  className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 min-w-[150px]"
                >
                  {isLoadingMore ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            ) : (
              <p className="text-center text-sm text-slate-500">
                Showing all {allEvents.length} events
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* View Event Modal - Detailed Dialog */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-0 flex flex-row items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Event Details</DialogTitle>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : eventDetails ? (
            <div className="space-y-4">
              {/* Event Photos */}
              {eventDetails.flyer_url && (
                <div className="px-6">
                  <img 
                    src={eventDetails.flyer_url} 
                    alt={eventDetails.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              )}
              
              {/* Event Title & Description */}
              <div className="px-6 space-y-3">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{eventDetails.title}</h3>
                
                {eventDetails.description && (
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {eventDetails.description}
                  </p>
                )}

                {/* Event Details Grid */}
                <div className="space-y-3 pt-2">
                  {/* Date */}
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-red-500">Date:</span>
                    <span>
                      {formatDateLong(eventDetails.event_date)}
                      {eventDetails.event_end_date && eventDetails.event_end_date !== eventDetails.event_date && (
                        <> to {formatDateLong(eventDetails.event_end_date)}</>
                      )}
                    </span>
                  </div>
                  
                  {/* Venue */}
                  {eventDetails.location && (
                    <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-red-500">Venue:</span>
                      <span>{eventDetails.location}</span>
                    </div>
                  )}
                  
                  {/* Participants */}
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-red-500">Participants:</span>
                    <span>
                      {eventDetails.male_participants !== null && eventDetails.male_participants !== undefined 
                        ? `${String(eventDetails.male_participants).padStart(2, '0')} (MALE)` 
                        : '00 (MALE)'
                      }
                      {' | '}
                      {eventDetails.female_participants !== null && eventDetails.female_participants !== undefined 
                        ? `${eventDetails.female_participants} (FEMALE)` 
                        : '00 (FEMALE)'
                      }
                    </span>
                  </div>
                  
                  {/* Activity Type */}
                  {eventDetails.activity_type && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-red-500">Activity:</span>
                      <span>{eventDetails.activity_type}</span>
                    </div>
                  )}
                  
                  {/* Created By */}
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-red-500">Created by:</span>
                    <span>{eventDetails.creator?.name || 'Admin'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="p-6 pt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setViewModalOpen(false)}
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </motion.div>
  );
}
