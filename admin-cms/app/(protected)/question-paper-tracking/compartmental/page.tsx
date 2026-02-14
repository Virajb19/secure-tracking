'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, Clock, CheckCircle, XCircle, Loader2, Download, X, ZoomIn, ExternalLink } from 'lucide-react';
import { examTrackerApi } from '@/services/api';
import { ExamTrackerEvent, ExamTrackerEventType } from '@/types';
import { toast } from 'sonner';

// QPT tracking steps aligned with mobile app
const trackingSteps = [
  { key: ExamTrackerEventType.TREASURY_ARRIVAL, label: 'Treasury / Bank', icon: '🏦' },
  { key: ExamTrackerEventType.CUSTODIAN_HANDOVER, label: 'Custodian Handover', icon: '🤝' },
  { key: ExamTrackerEventType.OPENING_MORNING, label: 'Opening', icon: '📦' },
  { key: ExamTrackerEventType.PACKING_MORNING, label: 'Packing', icon: '📦' },
  { key: ExamTrackerEventType.DELIVERY_MORNING, label: 'Delivery', icon: '📮' },
];

interface SchoolRow {
  schoolId: string;
  schoolName: string;
  registrationCode: string;
  superintendent: { name: string; phone: string } | null;
  events: Partial<Record<ExamTrackerEventType, ExamTrackerEvent>>;
  completedCount: number;
  lastActivity: string | null;
}

function groupBySchool(events: ExamTrackerEvent[]): SchoolRow[] {
  const map = new Map<string, SchoolRow>();

  for (const evt of events) {
    const sid = evt.school_id;
    if (!map.has(sid)) {
      map.set(sid, {
        schoolId: sid,
        schoolName: evt.school?.name || 'Unknown',
        registrationCode: evt.school?.registration_code || '',
        superintendent: evt.user ? { name: evt.user.name, phone: evt.user.phone } : null,
        events: {},
        completedCount: 0,
        lastActivity: null,
      });
    }
    const row = map.get(sid)!;
    row.events[evt.event_type] = evt;
    if (evt.user) {
      row.superintendent = { name: evt.user.name, phone: evt.user.phone };
    }
    if (!row.lastActivity || new Date(evt.submitted_at) > new Date(row.lastActivity)) {
      row.lastActivity = evt.submitted_at;
    }
  }

  for (const row of map.values()) {
    row.completedCount = Object.keys(row.events).length;
  }

  return Array.from(map.values()).sort((a, b) => a.schoolName.localeCompare(b.schoolName));
}

export default function CompartmentalExamsPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [events, setEvents] = useState<ExamTrackerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<ExamTrackerEvent | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await examTrackerApi.getAll({ date: selectedDate });
        setEvents(data);
      } catch (err) {
        console.error('Failed to fetch exam tracker events:', err);
        setError('Failed to load tracking data');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [selectedDate]);

  const schoolRows = useMemo(() => groupBySchool(events), [events]);

  const filteredRows = useMemo(() => {
    return schoolRows.filter((row) => {
      if (filter === 'all') return true;
      if (filter === 'completed') return row.completedCount >= trackingSteps.length;
      if (filter === 'pending') return row.completedCount < trackingSteps.length;
      return true;
    });
  }, [schoolRows, filter]);

  const totalCenters = schoolRows.length;
  const completedCenters = schoolRows.filter(r => r.completedCount >= trackingSteps.length).length;
  const totalEventsSubmitted = events.length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const getProgress = (row: SchoolRow): number => {
    return Math.round((row.completedCount / trackingSteps.length) * 100);
  };

  const handleDownload = async () => {
    if (filteredRows.length === 0) {
      toast.error('No data to download');
      return;
    }
    setDownloading(true);
    try {
      const headers = ['Sl.', 'Exam Center', 'Reg Code', 'Superintendent', 'Phone', 'Progress', ...trackingSteps.map(s => s.label), ...trackingSteps.map(s => `${s.label} Time`), 'Last Activity', 'Status'];
      const rows = filteredRows.map((row, index) => {
        const stepStatuses = trackingSteps.map(step => row.events[step.key] ? 'Done' : 'Pending');
        const stepTimes = trackingSteps.map(step => {
          const evt = row.events[step.key];
          return evt ? formatTime(evt.submitted_at) : '-';
        });
        const isComplete = row.completedCount >= trackingSteps.length;
        return [
          index + 1,
          `"${row.schoolName}"`,
          row.registrationCode,
          row.superintendent?.name || 'N/A',
          row.superintendent?.phone || 'N/A',
          `${getProgress(row)}%`,
          ...stepStatuses,
          ...stepTimes,
          row.lastActivity ? formatTime(row.lastActivity) : '-',
          isComplete ? 'COMPLETED' : 'IN_PROGRESS',
        ];
      });

      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qpt-compartmental-tracking-${selectedDate}.csv`;
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

  const getImageUrl = (imageUrl: string) => {
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '')}${imageUrl}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Question Paper Tracking — Compartmental Exams</h1>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleDownload}
            disabled={downloading || filteredRows.length === 0}
            className="gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/25 transition-all duration-300 disabled:opacity-50"
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
          <Link href="/question-paper-tracking">
            <Button variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              ← Back to Regular Exams
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Stats Cards */}
      {!loading && !error && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Centers</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalCenters}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-green-200 dark:border-green-800/30 p-4 shadow-sm">
            <p className="text-sm text-slate-500 dark:text-slate-400">Fully Completed</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedCenters}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800/30 p-4 shadow-sm">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Photos Uploaded</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalEventsSubmitted}</p>
          </div>
        </div>
      )}

      {/* Filters + Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex gap-4 items-end mb-6">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Select Date</label>
            <div className="flex items-center gap-2 h-10 px-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white text-sm border-none outline-none flex-1"
              />
            </div>
          </div>
          <div className="flex-1 max-w-xs">
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Status</label>
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Centers</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="text-center py-3 bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 rounded-t-lg border-b border-amber-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              QPT TRACKING — COMPARTMENTAL — {formatDate(selectedDate)}
            </h2>
            <p className="text-sm text-amber-600 dark:text-slate-400 mt-1">
              {filteredRows.length} exam center{filteredRows.length !== 1 ? 's' : ''} • {completedCenters}/{totalCenters} completed
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 bg-slate-50 dark:bg-slate-800/30">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500 mr-3" />
              <span className="text-slate-600 dark:text-slate-400">Loading tracking data...</span>
            </div>
          ) : error ? (
            <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/30">
              <p className="text-red-500 dark:text-red-400">{error}</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/30">
              <p className="text-slate-600 dark:text-slate-500">No tracking data found for this date</p>
              <p className="text-sm text-slate-500 dark:text-slate-600 mt-2">
                Try selecting a different date
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50">
                  <th className="text-left py-3 px-3 text-slate-600 dark:text-slate-400 font-medium text-xs whitespace-nowrap">Sl.</th>
                  <th className="text-left py-3 px-3 text-slate-600 dark:text-slate-400 font-medium text-xs whitespace-nowrap">Exam Center</th>
                  <th className="text-left py-3 px-3 text-slate-600 dark:text-slate-400 font-medium text-xs whitespace-nowrap">Center Superintendent</th>
                  <th className="text-left py-3 px-3 text-slate-600 dark:text-slate-400 font-medium text-xs whitespace-nowrap">Progress</th>
                  {trackingSteps.map((step) => (
                    <th key={step.key} className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                      <span className="text-lg block">{step.icon}</span>
                      <span className="text-[10px] leading-tight block mt-0.5">{step.label}</span>
                    </th>
                  ))}
                  <th className="text-center py-3 px-3 text-slate-600 dark:text-slate-400 font-medium text-xs whitespace-nowrap">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => (
                  <tr
                    key={row.schoolId}
                    className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${row.completedCount >= trackingSteps.length ? 'bg-green-50/50 dark:bg-green-500/5' : ''
                      }`}
                  >
                    <td className="py-4 px-3 text-slate-500 dark:text-slate-400 text-sm">{index + 1}</td>
                    <td className="py-4 px-3">
                      <span className="text-slate-900 dark:text-white font-medium text-sm">{row.schoolName}</span>
                      <span className="block text-[11px] text-slate-400 font-mono">{row.registrationCode}</span>
                    </td>
                    <td className="py-4 px-3">
                      <span className="text-slate-700 dark:text-slate-300 text-sm">{row.superintendent?.name || 'N/A'}</span>
                      <span className="block text-[11px] text-slate-400">{row.superintendent?.phone}</span>
                    </td>
                    <td className="py-4 px-3">
                      <div className="w-28">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${row.completedCount >= trackingSteps.length ? 'bg-green-500' : 'bg-amber-500'
                                }`}
                              style={{ width: `${getProgress(row)}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 w-8 text-right">{getProgress(row)}%</span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">{row.completedCount}/{trackingSteps.length} steps</span>
                      </div>
                    </td>
                    {trackingSteps.map((step) => {
                      const event = row.events[step.key];
                      return (
                        <td key={step.key} className="text-center py-4 px-2">
                          {event ? (
                            <button
                              onClick={() => setSelectedEvent(event)}
                              className="group relative inline-flex flex-col items-center gap-0.5"
                              title={`${step.label} — uploaded at ${formatTime(event.submitted_at)} — Click to view photo`}
                            >
                              <div className="relative w-10 h-10 rounded-lg bg-green-100 dark:bg-green-500/20 border border-green-300 dark:border-green-500/30 hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors flex items-center justify-center">
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                                  <ZoomIn className="h-2.5 w-2.5 text-white" />
                                </span>
                              </div>
                              <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                                {formatTime(event.submitted_at)}
                              </span>
                            </button>
                          ) : (
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 flex items-center justify-center">
                                <XCircle className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                              </div>
                              <span className="text-[10px] text-slate-400">—</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center py-4 px-3">
                      {row.lastActivity ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatTime(row.lastActivity)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Photo Detail Dialog */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {trackingSteps.find(s => s.key === selectedEvent.event_type)?.icon}{' '}
                  {trackingSteps.find(s => s.key === selectedEvent.event_type)?.label || selectedEvent.event_type}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedEvent.school?.name}
                  {selectedEvent.school?.registration_code && (
                    <span className="ml-1 font-mono text-xs">({selectedEvent.school.registration_code})</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Magnified Photo */}
            {selectedEvent.image_url && (
              <div className="p-5 bg-slate-50 dark:bg-slate-800/50">
                <img
                  src={getImageUrl(selectedEvent.image_url)}
                  alt="Evidence photo"
                  className="w-full max-h-[50vh] object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.insertAdjacentHTML('afterend', '<div class="p-8 text-center"><p class="text-slate-500">Image unavailable</p></div>');
                  }}
                />
              </div>
            )}

            {/* Event Details Grid */}
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">Uploaded At</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {formatTime(selectedEvent.submitted_at)}
                    <span className="text-slate-400 text-xs ml-1.5">
                      {new Date(selectedEvent.submitted_at).toLocaleDateString('en-GB')}
                    </span>
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs">👤</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Submitted By</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {selectedEvent.user?.name || 'Unknown'}
                    <span className="text-slate-400 text-xs ml-1.5">{selectedEvent.user?.phone}</span>
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">GPS Location</span>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${selectedEvent.latitude},${selectedEvent.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-400 text-xs flex items-center gap-1"
                  >
                    Open in Maps <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-sm font-mono text-slate-700 dark:text-slate-300">
                  {Number(selectedEvent.latitude).toFixed(6)}, {Number(selectedEvent.longitude).toFixed(6)}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs">🔐</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">SHA-256 Image Hash</span>
                </div>
                <p className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all">
                  {selectedEvent.image_hash}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
