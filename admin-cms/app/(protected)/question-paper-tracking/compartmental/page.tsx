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
import { Search, MapPin, Clock, Image as ImageIcon, CheckCircle, XCircle, Loader2, FileText, ArrowLeft } from 'lucide-react';
import { tasksApi } from '@/services/api';
import { Task, TaskEvent, TaskStatus, EventType } from '@/types';

// 5-step tracking workflow columns
const trackingSteps = [
  { key: EventType.PICKUP_POLICE_STATION, label: 'Police Station Pickup', icon: '🚔' },
  { key: EventType.ARRIVAL_EXAM_CENTER, label: 'Exam Center Arrival', icon: '🏫' },
  { key: EventType.OPENING_SEAL, label: 'Opening Seal', icon: '📦' },
  { key: EventType.SEALING_ANSWER_SHEETS, label: 'Sealing Answer Sheets', icon: '✍️' },
  { key: EventType.SUBMISSION_POST_OFFICE, label: 'Post Office Submission', icon: '📮' },
];

export default function CompartmentalExamsPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [shift, setShift] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<TaskEvent | null>(null);

  // Fetch tasks on mount and when filters change
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await tasksApi.getOverview({
          exam_type: 'COMPARTMENTAL',
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

  // Filter tasks based on shift (using start_time hour as proxy)
  const filteredTasks = tasks.filter((task) => {
    if (shift === 'all') return true;
    const hour = new Date(task.start_time).getHours();
    if (shift === 'morning') return hour < 12;
    if (shift === 'afternoon') return hour >= 12;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/question-paper-tracking">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white">Compartmental Exam Tracking</h1>
        </div>
        <Button className="gap-2 bg-slate-800 hover:bg-slate-700">
          <FileText className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex gap-4 items-end mb-6">
          {/* Date Filter */}
          <div className="flex-1">
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

          {/* Shift Filter */}
          <div className="flex-1">
            <label className="block text-sm text-slate-400 mb-2">Shift</label>
            <Select value={shift} onValueChange={(v) => setShift(v as typeof shift)}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="All Shifts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shifts</SelectItem>
                <SelectItem value="morning">Morning Shift</SelectItem>
                <SelectItem value="afternoon">Afternoon Shift</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="bg-blue-600 hover:bg-blue-700 px-6"
            onClick={() => setSelectedDate(selectedDate)}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Paper Tracking Summary Table */}
        <div className="overflow-x-auto">
          <div className="text-center py-3 bg-gradient-to-r from-orange-900/30 via-orange-800/20 to-orange-900/30 rounded-t-lg border-b border-orange-500/20">
            <h2 className="text-lg font-semibold text-white">
              COMPARTMENTAL EXAM TRACKING - {formatDate(selectedDate)}
            </h2>
            <p className="text-sm text-orange-400 mt-1">
              {shift === 'all' ? 'All Shifts' : `${shift.charAt(0).toUpperCase() + shift.slice(1)} Shift`} • {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 bg-slate-800/30">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500 mr-3" />
              <span className="text-slate-400">Loading tracking data...</span>
            </div>
          ) : error ? (
            <div className="py-8 text-center bg-slate-800/30">
              <p className="text-red-400">{error}</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-8 text-center bg-slate-800/30">
              <p className="text-slate-500">No compartmental exam data found for this date</p>
              <p className="text-sm text-slate-600 mt-2">
                Create tasks with &quot;Compartmental&quot; exam type to see them here
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium whitespace-nowrap">Sl.</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium whitespace-nowrap">Pack Code</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium whitespace-nowrap">Assigned To</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium whitespace-nowrap">Shift</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium whitespace-nowrap">Progress</th>
                  {trackingSteps.map((step) => (
                    <th key={step.key} className="text-center py-3 px-2 text-slate-400 font-medium whitespace-nowrap">
                      <span className="text-lg">{step.icon}</span>
                    </th>
                  ))}
                  <th className="text-center py-3 px-4 text-slate-400 font-medium whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, index) => {
                  const hour = new Date(task.start_time).getHours();
                  const taskShift = hour < 12 ? 'Morning' : 'Afternoon';

                  return (
                    <tr
                      key={task.id}
                      className={`border-b border-slate-800 hover:bg-slate-800/50 ${task.status === TaskStatus.SUSPICIOUS ? 'bg-red-500/5' : ''
                        }`}
                    >
                      <td className="py-4 px-4 text-slate-300">{index + 1}</td>
                      <td className="py-4 px-4">
                        <span className="font-mono text-sm text-orange-400">{task.sealed_pack_code}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-slate-300">{task.assigned_user?.name || 'N/A'}</span>
                        <span className="block text-xs text-slate-500">{task.assigned_user?.phone}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${taskShift === 'Morning'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-purple-500/20 text-purple-400'
                          }`}>
                          {taskShift}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="w-24">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${task.status === TaskStatus.COMPLETED ? 'bg-green-500' :
                                    task.status === TaskStatus.SUSPICIOUS ? 'bg-red-500' : 'bg-orange-500'
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
                                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
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
                          className="text-orange-400 hover:text-orange-300 text-sm font-medium"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
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
                    className="w-full rounded-lg border border-slate-700 hover:border-orange-500 transition-colors cursor-pointer"
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
