'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, Clock, Image as ImageIcon, CheckCircle, XCircle, Loader2, Download } from 'lucide-react';
import { tasksApi } from '@/services/api';
import { Task, TaskEvent, TaskStatus, EventType } from '@/types';
import { toast } from 'sonner';

// 5-step tracking workflow columns
const trackingSteps = [
  { key: EventType.PICKUP_POLICE_STATION, label: 'Police Station Pickup', icon: '🚔' },
  { key: EventType.ARRIVAL_EXAM_CENTER, label: 'Exam Center Arrival', icon: '🏫' },
  { key: EventType.OPENING_SEAL, label: 'Opening Seal', icon: '📦' },
  { key: EventType.SEALING_ANSWER_SHEETS, label: 'Sealing Answer Sheets', icon: '✍️' },
  { key: EventType.SUBMISSION_POST_OFFICE, label: 'Post Office Submission', icon: '📮' },
];

export default function QuestionPaperTrackingPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<TaskEvent | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Fetch tasks on mount and when filters change
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await tasksApi.getOverview({
          exam_type: 'REGULAR',
          date: selectedDate,
        });
        setTasks(data);
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
        setError('Failed to load tracking data');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [selectedDate]);

  // Filter tasks based on status
  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    if (filter === 'completed') return task.status === TaskStatus.COMPLETED;
    if (filter === 'pending') return task.status !== TaskStatus.COMPLETED;
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  // Get event by type for a task
  const getEventByType = (task: Task, eventType: EventType): TaskEvent | undefined => {
    return task.events?.find(e => e.event_type === eventType);
  };

  // Get progress percentage
  const getProgress = (task: Task): number => {
    if (!task.events || task.events.length === 0) return 0;
    return Math.round((task.events.length / 5) * 100);
  };

  // Download CSV function
  const handleDownload = async () => {
    if (filteredTasks.length === 0) {
      toast.error('No data to download');
      return;
    }

    setDownloading(true);
    try {
      // Build CSV content
      const headers = ['Sl.', 'Pack Code', 'Assigned To', 'Phone', 'Progress', ...trackingSteps.map(s => s.label), 'Status'];
      const rows = filteredTasks.map((task, index) => {
        const stepStatuses = trackingSteps.map(step => {
          const event = getEventByType(task, step.key);
          return event ? 'Completed' : 'Pending';
        });
        return [
          index + 1,
          task.sealed_pack_code,
          task.assigned_user?.name || 'N/A',
          task.assigned_user?.phone || 'N/A',
          `${getProgress(task)}%`,
          ...stepStatuses,
          task.status
        ];
      });

      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `regular-exam-tracking-${selectedDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Downloaded successfully!');
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Failed to download');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Question Paper Tracking - Regular Exams</h1>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleDownload}
            disabled={downloading || filteredTasks.length === 0}
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-all duration-300 disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download CSV
              </>
            )}
          </Button>
          <Link href="/question-paper-tracking/compartmental">
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              View Compartmental Exams →
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex gap-4 items-end mb-6">
          {/* Date Filter */}
          <div className="flex-1 max-w-xs">
            <label className="block text-sm text-slate-400 mb-2">Select Date</label>
            <div className="flex items-center gap-2 h-10 px-3 bg-slate-800 border border-slate-700 rounded-md">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white text-sm border-none outline-none flex-1"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex-1 max-w-xs">
            <label className="block text-sm text-slate-400 mb-2">Status</label>
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Paper Tracking Summary Table */}
        <div className="overflow-x-auto">
          <div className="text-center py-3 bg-slate-800 rounded-t-lg">
            <h2 className="text-lg font-semibold text-white">
              PAPER TRACKING SUMMARY - {formatDate(selectedDate)}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Regular Exams • {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 bg-slate-800/30">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-3" />
              <span className="text-slate-400">Loading tracking data...</span>
            </div>
          ) : error ? (
            <div className="py-8 text-center bg-slate-800/30">
              <p className="text-red-400">{error}</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-8 text-center bg-slate-800/30">
              <p className="text-slate-500">No tracking data found for this date</p>
              <p className="text-sm text-slate-600 mt-2">
                Try selecting a different date or create new tasks
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium whitespace-nowrap">Sl.</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium whitespace-nowrap">Pack Code</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium whitespace-nowrap">Assigned To</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium whitespace-nowrap">Progress</th>
                  {trackingSteps.map((step) => (
                    <th key={step.key} className="text-center py-3 px-2 text-slate-400 font-medium whitespace-nowrap">
                      <span className="text-lg">{step.icon}</span>
                      <span className="sr-only">{step.label}</span>
                    </th>
                  ))}
                  <th className="text-center py-3 px-4 text-slate-400 font-medium whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, index) => (
                  <tr
                    key={task.id}
                    className={`border-b border-slate-800 hover:bg-slate-800/50 ${task.status === TaskStatus.SUSPICIOUS ? 'bg-red-500/5' : ''
                      }`}
                  >
                    <td className="py-4 px-4 text-slate-300">{index + 1}</td>
                    <td className="py-4 px-4">
                      <span className="font-mono text-sm text-blue-400">{task.sealed_pack_code}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-slate-300">{task.assigned_user?.name || 'N/A'}</span>
                      <span className="block text-xs text-slate-500">{task.assigned_user?.phone}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="w-24">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${task.status === TaskStatus.COMPLETED ? 'bg-green-500' :
                                  task.status === TaskStatus.SUSPICIOUS ? 'bg-red-500' : 'bg-blue-500'
                                }`}
                              style={{ width: `${getProgress(task)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 w-8">{getProgress(task)}%</span>
                        </div>
                      </div>
                    </td>
                    {trackingSteps.map((step) => {
                      const event = getEventByType(task, step.key);
                      return (
                        <td key={step.key} className="text-center py-4 px-2">
                          {event ? (
                            <button
                              onClick={() => setSelectedEvent(event)}
                              className="group relative inline-flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 hover:bg-green-500/30 transition-colors"
                              title={`${step.label} - Click for details`}
                            >
                              <CheckCircle className="h-5 w-5 text-green-400" />
                              {event.image_url && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                  <ImageIcon className="h-2 w-2 text-white" />
                                </span>
                              )}
                            </button>
                          ) : (
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-700/50 border border-slate-600">
                              <XCircle className="h-5 w-5 text-slate-500" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center py-4 px-4">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {trackingSteps.find(s => s.key === selectedEvent.event_type)?.label}
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-2 text-emerald-400 mb-3">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{formatTime(selectedEvent.server_timestamp)}</span>
              <span className="text-slate-400 text-sm">
                ({new Date(selectedEvent.server_timestamp).toLocaleDateString('en-GB')})
              </span>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 text-slate-300 mb-4">
              <MapPin className="h-4 w-4 text-blue-400" />
              <span>📍 {Number(selectedEvent.latitude).toFixed(6)}, {Number(selectedEvent.longitude).toFixed(6)}</span>
              <a
                href={`https://www.google.com/maps?q=${selectedEvent.latitude},${selectedEvent.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-xs ml-2"
              >
                View on Map →
              </a>
            </div>

            {/* Image */}
            {selectedEvent.image_url && (
              <div className="mb-4">
                <p className="text-xs text-slate-400 mb-2">📸 Evidence Photo:</p>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '')}${selectedEvent.image_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '')}${selectedEvent.image_url}`}
                    alt="Evidence"
                    className="w-full rounded-lg border border-slate-700 hover:border-blue-500 transition-colors cursor-pointer"
                  />
                </a>
              </div>
            )}

            {/* Hash */}
            <div className="text-xs text-slate-500 font-mono break-all bg-slate-900/50 p-2 rounded border border-slate-800">
              🔐 SHA-256: {selectedEvent.image_hash}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
