'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, FileText, Check, X, Loader2, AlertTriangle, Eye, RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { formSubmissionsApi, FormSubmission } from '@/services/paper-setter.service';
import { masterDataApi } from '@/services/api';
import { toast } from 'sonner';
import { RetryButton } from '@/components/RetryButton';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import { TableRowsSkeleton } from '@/components/TableSkeleton';
import { ApproveFormButton } from '@/components/ApproveFormButton';
import { RejectFormButton } from '@/components/RejectFormButton';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useDebounceCallback } from 'usehooks-ts';

// Animation variants for table rows
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
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } }
};

const formTypes = [
  { value: '6A', label: 'Form 6A (Teaching Staff Pre-Primary to Class 10)' },
  { value: '6B', label: 'Form 6B (Non-Teaching Staff)' },
  { value: '6C_LOWER', label: 'Form 6C Lower (Students Pre-Primary to Class 10)' },
  { value: '6C_HIGHER', label: 'Form 6C Higher (Students Class 11 & 12)' },
  { value: '6D', label: 'Form 6D (Teaching Staff Class 11 & 12)' },
];

const classNames: Record<number, string> = {
  0: 'Pre-Primary',
  1: 'Class 1',
  2: 'Class 2',
  3: 'Class 3',
  4: 'Class 4',
  5: 'Class 5',
  6: 'Class 6',
  7: 'Class 7',
  8: 'Class 8',
  9: 'Class 9',
  10: 'Class 10',
  11: 'Class 11',
  12: 'Class 12',
};

export default function Form6Page() {
  const queryClient = useQueryClient();
  const [formType, setFormType] = useState('all');
  const [districtId, setDistrictId] = useState('all');
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Refs for auto-scrolling pagination without scrolling the whole page
  const activePageBtnRef = useRef<HTMLButtonElement>(null);
  const paginationScrollRef = useRef<HTMLDivElement>(null);

  // Debounce the search
  const debouncedSetSearch = useDebounceCallback(setSearchQuery, 500);

  const [viewDialog, setViewDialog] = useState<{ open: boolean; schoolId: string | null; formType: string | null; schoolName: string }>({
    open: false,
    schoolId: null,
    formType: null,
    schoolName: ''
  });
  const [downloadingXlsx, setDownloadingXlsx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch districts for filter
  const { data: districts = [] } = useQuery({
    queryKey: ['districts'],
    queryFn: masterDataApi.getDistricts,
  });

  // Fetch form submission stats for dashboard cards
  const { data: stats } = useQuery({
    queryKey: ['form-submission-stats'],
    queryFn: formSubmissionsApi.getStats,
    refetchInterval: 30000, // Refetch every 30 seconds to keep stats fresh
  });

  const ITEMS_PER_PAGE = 20;

  // Fetch all submissions with filters
  const { data, isFetching, isLoading, error } = useQuery({
    queryKey: ['form-submissions', formType, districtId, statusFilter, page],
    queryFn: () => formSubmissionsApi.getAll(
      formType !== 'all' ? formType : undefined,
      page,
      ITEMS_PER_PAGE,
      districtId !== 'all' ? districtId : undefined,
      statusFilter !== 'all' ? statusFilter : undefined
    ),
    placeholderData: (previousData) => previousData,
  });

  const totalPages = data ? Math.ceil((data.total || 0) / ITEMS_PER_PAGE) : 1;

  // Auto-scroll only the horizontal pagination container (not the whole page)
  useEffect(() => {
    const container = paginationScrollRef.current;
    const activeBtn = activePageBtnRef.current;
    if (container && activeBtn) {
      const btnRect = activeBtn.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const scrollLeft = container.scrollLeft + (btnRect.left - containerRect.left) - container.clientWidth / 2 + btnRect.width / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [page, totalPages]);

  // Prefetch next page
  useEffect(() => {
    if (page < totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['form-submissions', formType, districtId, statusFilter, page + 1],
        queryFn: () => formSubmissionsApi.getAll(
          formType !== 'all' ? formType : undefined,
          page + 1,
          ITEMS_PER_PAGE,
          districtId !== 'all' ? districtId : undefined,
          statusFilter !== 'all' ? statusFilter : undefined
        ),
      });
    }
  }, [page, totalPages, formType, districtId, statusFilter, queryClient]);

  // Fetch form details for viewing
  const { data: viewData, isLoading: viewLoading } = useQuery({
    queryKey: ['form-details', viewDialog.formType, viewDialog.schoolId],
    queryFn: async () => {
      if (!viewDialog.schoolId || !viewDialog.formType) return null;
      switch (viewDialog.formType) {
        case '6A':
          return formSubmissionsApi.getForm6ADetails(viewDialog.schoolId);
        case '6B':
          return formSubmissionsApi.getForm6BDetails(viewDialog.schoolId);
        case '6C_LOWER':
          return formSubmissionsApi.getForm6CLowerDetails(viewDialog.schoolId);
        case '6C_HIGHER':
          return formSubmissionsApi.getForm6CHigherDetails(viewDialog.schoolId);
        case '6D':
          return formSubmissionsApi.getForm6DDetails(viewDialog.schoolId);
        default:
          return null;
      }
    },
    enabled: viewDialog.open && !!viewDialog.schoolId && !!viewDialog.formType,
  });

  const handleDownloadXlsx = async () => {
    if (downloadingXlsx || submissions.length === 0) return;
    setDownloadingXlsx(true);

    try {
      // Create worksheet data
      const wsData = submissions.map((sub, index) => ({
        'Sl No.': index + 1,
        'School Name': sub.school?.name || '-',
        'Registration Code': sub.school?.registration_code || '-',
        'District': sub.school?.district?.name || '-',
        'Form Type': formTypes.find(f => f.value === sub.form_type)?.label || sub.form_type,
        'Submitted At': sub.submitted_at
          ? new Date(sub.submitted_at).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
          : '-',
        'Status': sub.status,
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Form Submissions');

      // Download
      XLSX.writeFile(wb, `form-submissions-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Downloaded successfully');
    } catch (err) {
      toast.error('Failed to download');
    } finally {
      setDownloadingXlsx(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (downloadingPdf || submissions.length === 0) return;
    setDownloadingPdf(true);

    try {
      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.text('Form 6 Submissions Report', 14, 22);

      // Date
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`, 14, 30);

      // Table data
      const tableData = submissions.map((sub, index) => [
        index + 1,
        sub.school?.name || '-',
        sub.school?.registration_code || '-',
        sub.school?.district?.name || '-',
        formTypes.find(f => f.value === sub.form_type)?.label?.replace(/Form \d[A-Z]? \(|\)/g, '') || sub.form_type,
        sub.submitted_at
          ? new Date(sub.submitted_at).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
          : '-',
        sub.status,
      ]);

      autoTable(doc, {
        head: [['#', 'School Name', 'Reg. Code', 'District', 'Form Type', 'Submitted', 'Status']],
        body: tableData,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      doc.save(`form-submissions-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (err) {
      console.error('PDF Error:', err);
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleView = (submission: FormSubmission) => {
    setViewDialog({
      open: true,
      schoolId: submission.school_id,
      formType: submission.form_type,
      schoolName: `${submission.school?.registration_code || ''} - ${submission.school?.name || 'School'}`
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500">Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500">Rejected</Badge>;
      case 'SUBMITTED':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500">Pending</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-400 border-slate-400">Draft</Badge>;
    }
  };

  const allSubmissions = data?.data || [];
  const total = data?.total || 0;

  // Filter submissions by search query (client-side)
  const submissions = useMemo(() => {
    if (!searchQuery.trim()) return allSubmissions;
    const query = searchQuery.toLowerCase();
    return allSubmissions.filter((sub: FormSubmission) =>
      sub.school?.name?.toLowerCase().includes(query) ||
      sub.school?.registration_code?.toLowerCase().includes(query)
    );
  }, [allSubmissions, searchQuery]);

  // Render view dialog content based on form type
  const renderViewDialogContent = () => {
    if (viewLoading) {
      return (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      );
    }

    if (!viewData) {
      return <p className="text-slate-500 text-center py-8">No data available</p>;
    }

    // Form 6A or 6D - Teaching Staff
    if (viewDialog.formType === '6A' || viewDialog.formType === '6D') {
      const staffData = viewData as { school: any; staff: any[] };
      return (
        <div className="overflow-x-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-slate-700 dark:text-slate-300">Sl No.</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">Name</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">Designation</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">Experience</TableHead>
                {viewDialog.formType === '6A' && (
                  <>
                    <TableHead className="text-slate-700 dark:text-slate-300">Class 8 Subject</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300">Class 9 Subject</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300">Class 10 Subject</TableHead>
                  </>
                )}
                {viewDialog.formType === '6D' && (
                  <>
                    <TableHead className="text-slate-700 dark:text-slate-300">Class 11 Subject</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300">Class 12 Subject</TableHead>
                  </>
                )}
                <TableHead className="text-slate-700 dark:text-slate-300">Phone Number</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffData.staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={viewDialog.formType === '6A' ? 8 : 7} className="text-center py-8 text-slate-500">
                    No teaching staff found
                  </TableCell>
                </TableRow>
              ) : (
                staffData.staff.map((staff, index) => {
                  const subjectsByClass: Record<number, string[]> = {};
                  staff.teaching_assignments?.forEach((ta: any) => {
                    if (!subjectsByClass[ta.class_level]) subjectsByClass[ta.class_level] = [];
                    subjectsByClass[ta.class_level].push(ta.subject);
                  });

                  return (
                    <TableRow key={staff.id}>
                      <TableCell className="text-slate-700 dark:text-slate-300">{index + 1}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{staff.user?.name || '-'}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{staff.designation || 'Teacher'}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{staff.years_of_experience || 0}</TableCell>
                      {viewDialog.formType === '6A' && (
                        <>
                          <TableCell className="text-slate-700 dark:text-slate-300">{subjectsByClass[8]?.join(', ') || ''}</TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-300">{subjectsByClass[9]?.join(', ') || ''}</TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-300">{subjectsByClass[10]?.join(', ') || ''}</TableCell>
                        </>
                      )}
                      {viewDialog.formType === '6D' && (
                        <>
                          <TableCell className="text-slate-700 dark:text-slate-300">{subjectsByClass[11]?.join(', ') || ''}</TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-300">{subjectsByClass[12]?.join(', ') || ''}</TableCell>
                        </>
                      )}
                      <TableCell className="text-slate-700 dark:text-slate-300">{staff.user?.phone || '-'}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      );
    }

    // Form 6B - Non-Teaching Staff
    if (viewDialog.formType === '6B') {
      const staffData = viewData as { school: any; staff: any[] };
      return (
        <div className="overflow-x-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-slate-700 dark:text-slate-300">Sl No.</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">Full Name</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">Qualification</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">Nature of Work</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">Years of Service</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">Phone Number</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffData.staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No non-teaching staff found
                  </TableCell>
                </TableRow>
              ) : (
                staffData.staff.map((staff, index) => (
                  <TableRow key={staff.id}>
                    <TableCell className="text-slate-700 dark:text-slate-300">{index + 1}</TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300">{staff.full_name}</TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300">{staff.qualification}</TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300">{staff.nature_of_work}</TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300">{staff.years_of_service}</TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300">{staff.phone}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      );
    }

    // Form 6C Lower/Higher - Student Strength
    if (viewDialog.formType === '6C_LOWER' || viewDialog.formType === '6C_HIGHER') {
      const strengthData = viewData as { school: any; strengths: any[] };
      const totals = strengthData.strengths.reduce(
        (acc, s) => ({
          boys: acc.boys + s.boys,
          girls: acc.girls + s.girls,
          sections: acc.sections + s.sections,
        }),
        { boys: 0, girls: 0, sections: 0 }
      );

      return (
        <div className="overflow-x-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-slate-700 dark:text-slate-300">Class</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">Boys</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">Girls</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">Sections</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {strengthData.strengths.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                    No student strength data found
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {strengthData.strengths.map((strength) => (
                    <TableRow key={strength.id}>
                      <TableCell className="text-slate-700 dark:text-slate-300 font-medium">
                        {classNames[strength.class_level] || `Class ${strength.class_level}`}
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{strength.boys}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{strength.girls}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{strength.sections}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-100 dark:bg-slate-800 font-bold">
                    <TableCell className="text-slate-900 dark:text-white">Total</TableCell>
                    <TableCell className="text-slate-900 dark:text-white">{totals.boys}</TableCell>
                    <TableCell className="text-slate-900 dark:text-white">{totals.girls}</TableCell>
                    <TableCell className="text-slate-900 dark:text-white">{totals.sections}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Form 6 Approvals</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Review and approve form submissions</p>
          </div>
        </div>
        <div className="flex gap-3">
          <RefreshTableButton queryKey={['form-submissions', formType, districtId, statusFilter, page]} isFetching={isFetching} />
          <button
            type="button"
            onClick={handleDownloadXlsx}
            aria-busy={downloadingXlsx}
            disabled={downloadingXlsx || submissions.length === 0}
            className={twMerge(
              "group gap-3 hover:-translate-y-1 cursor-pointer relative overflow-hidden border-slate-600 bg-blue-600 text-white flex items-center justify-center px-7 py-2 rounded-lg hover:opacity-90 duration-200 font-semibold text-lg",
              (downloadingXlsx || submissions.length === 0) ? "pointer-events-none opacity-50 cursor-not-allowed hover:translate-y-0" : ""
            )}
          >
            {!downloadingXlsx && (
              <span
                className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-[200%] transition-transform duration-700"
                style={{ width: "50%" }}
              />
            )}
            <span
              className={
                "relative z-10 inline-flex items-center gap-2 " +
                "motion-reduce:transform-none " +
                (downloadingXlsx ? "opacity-80" : "")
              }
            >
              <span
                className={
                  "grid place-items-center rounded-md bg-[#A9C8FB] p-2 border " +
                  "transition-transform duration-200 group-hover:scale-105 group-active:scale-100 " +
                  "motion-reduce:transition-none"
                }
              >
                {downloadingXlsx ? (<RefreshCw className="animate-spin size-5" />) : (<Download className="size-5" />)}
              </span>
              <span className="tracking-tight">{downloadingXlsx ? "Downloading…" : "Download XLSX"}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || submissions.length === 0}
            className={twMerge(
              "group gap-3 hover:-translate-y-1 cursor-pointer relative overflow-hidden border-slate-600 bg-slate-800 text-white flex items-center justify-center px-6 py-2 rounded-lg hover:bg-slate-700 duration-200 font-semibold",
              (downloadingPdf || submissions.length === 0) ? "pointer-events-none opacity-50 cursor-not-allowed hover:translate-y-0" : ""
            )}
          >
            <span className="relative z-10 inline-flex items-center gap-2">
              <span className="grid place-items-center rounded-md bg-slate-700 p-2">
                {downloadingPdf ? (<RefreshCw className="animate-spin size-4" />) : (<FileText className="size-4" />)}
              </span>
              <span className="tracking-tight">{downloadingPdf ? "Downloading…" : "Download PDF"}</span>
            </span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm dark:shadow-none">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Pending</p>
          <p className="text-2xl font-bold text-orange-500 dark:text-orange-400">{stats?.pending ?? total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm dark:shadow-none">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Approved Today</p>
          <p className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{stats?.approvedToday ?? 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm dark:shadow-none">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Rejected Today</p>
          <p className="text-2xl font-bold text-red-500 dark:text-red-400">{stats?.rejectedToday ?? 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm dark:shadow-none">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Total Processed</p>
          <p className="text-2xl font-bold text-blue-500 dark:text-blue-400">{stats?.totalProcessed ?? 0}</p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm dark:shadow-none">
        {/* Search Bar */}
        <div className="mb-4">
          <label className="text-sm text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search School
          </label>
          <Input
            placeholder="Search by school name or registration code..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              debouncedSetSearch(e.target.value);
            }}
            className="bg-slate-50 dark:bg-slate-800 border-blue-400 dark:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-slate-500 dark:text-slate-400 mb-1 block">Form Type</label>
            <Select value={formType} onValueChange={(v) => { setFormType(v); setPage(1); }}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-blue-400 dark:border-blue-500 text-slate-900 dark:text-white">
                <SelectValue placeholder="All Form Types" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectItem value="all" className="text-slate-900 dark:text-white">All Form Types</SelectItem>
                {formTypes.map((f) => (
                  <SelectItem key={f.value} value={f.value} className="text-slate-900 dark:text-white">{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-slate-500 dark:text-slate-400 mb-1 block">District</label>
            <Select value={districtId} onValueChange={(v) => { setDistrictId(v); setPage(1); }}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-blue-400 dark:border-blue-500 text-slate-900 dark:text-white">
                <SelectValue placeholder="All Districts" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectItem value="all" className="text-slate-900 dark:text-white">All Districts</SelectItem>
                {districts.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-slate-900 dark:text-white">{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="text-sm text-slate-500 dark:text-slate-400 mb-1 block">Status</label>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-blue-400 dark:border-blue-500 text-slate-900 dark:text-white">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectItem value="all" className="text-slate-900 dark:text-white">All Status</SelectItem>
                <SelectItem value="SUBMITTED" className="text-slate-900 dark:text-white">Pending</SelectItem>
                <SelectItem value="APPROVED" className="text-slate-900 dark:text-white">Approved</SelectItem>
                <SelectItem value="REJECTED" className="text-slate-900 dark:text-white">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        {error ? (
          <RetryButton
            queryKey={['form-submissions']}
            message="Failed to load form submissions"
          />
        ) : (
          <div className={`overflow-x-auto relative transition-opacity duration-200 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
            {isFetching && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 z-10">
                <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
              </div>
            )}
            <table className={`w-full transition-opacity duration-200 ${isFetching && !isLoading ? 'pointer-events-none select-none' : ''}`}>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Sl No.</th>
                  <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">School</th>
                  <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Form Type</th>
                  <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Submitted At</th>
                  <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableRowsSkeleton rows={10} columns={6} />
                ) : (
                  <AnimatePresence mode="popLayout">
                    {submissions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-500">
                          No form submissions found
                        </td>
                      </tr>
                    ) : (
                      submissions.map((submission, index) => (
                        <motion.tr
                          key={submission.id}
                          custom={index}
                          variants={tableRowVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          layout

                          className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="py-4 px-4 text-slate-700 dark:text-slate-300">{(page - 1) * 20 + index + 1}</td>
                          <td className="py-4 px-4">
                            <div>
                              <p className="text-blue-600 dark:text-blue-400 font-medium">
                                {submission.school?.name || 'School Name'}
                              </p>
                              <p className="text-slate-400 dark:text-slate-500 text-sm">
                                {submission.school?.district?.name || 'District'}
                              </p>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-slate-700 dark:text-slate-300">
                            {formTypes.find(f => f.value === submission.form_type)?.label || submission.form_type}
                          </td>
                          <td className="py-4 px-4 text-slate-700 dark:text-slate-300">
                            {submission.submitted_at
                              ? new Date(submission.submitted_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                              : '-'
                            }
                          </td>
                          <td className="py-4 px-4">
                            {getStatusBadge(submission.status)}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
                                onClick={() => handleView(submission)}
                              >
                                <Eye className="h-4 w-4 mr-1" /> View
                              </Button>
                              {submission.status === 'SUBMITTED' && (
                                <>
                                  <ApproveFormButton
                                    submissionId={submission.id}
                                    formType={submission.form_type}
                                  />
                                  <RejectFormButton
                                    submissionId={submission.id}
                                    formType={submission.form_type}
                                  />
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || isFetching}
                onClick={() => setPage(p => p - 1)}
                className="gap-1 shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div ref={paginationScrollRef} className="flex items-center gap-1 overflow-x-auto max-w-[250px] md:max-w-[400px] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent py-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    ref={page === pageNum ? activePageBtnRef : undefined}
                    onClick={() => setPage(pageNum)}
                    disabled={isFetching}
                    className={`relative flex-shrink-0 h-9 min-w-[36px] px-2.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed ${page === pageNum
                      ? 'text-white dark:text-slate-900'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50'
                      }`}
                  >
                    {page === pageNum && (
                      <motion.div
                        className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-600 to-blue-600 dark:from-white dark:to-white shadow-md shadow-blue-500/20 dark:shadow-white/10"
                        layoutId="activeFormPage"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{pageNum}</span>
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage(p => p + 1)}
                className="gap-1 shrink-0"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* View Form Details Dialog */}
      <Dialog open={viewDialog.open} onOpenChange={(open) => setViewDialog({ ...viewDialog, open })}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              {formTypes.find(f => f.value === viewDialog.formType)?.label || 'Form'} Details
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              {viewDialog.schoolName} | {formTypes.find(f => f.value === viewDialog.formType)?.label || viewDialog.formType}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex-1 overflow-auto min-h-0">
            {renderViewDialogContent()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialog({ open: false, schoolId: null, formType: null, schoolName: '' })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
