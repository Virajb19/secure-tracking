'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Search, Trash2, Plus, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { paperSetterApi, PaperSetterSelection, TeacherSearchResult } from '@/services/paper-setter.service';
import { toast } from 'sonner';
import { RetryButton } from '@/components/RetryButton';
import { RefreshTableButton } from '@/components/RefreshTableButton';

const subjects = ['Science', 'Mathematics', 'English', 'Social Science', 'Hindi', 'Alternative English'];
const classLevels = ['10', '12'];

export default function PaperSettersPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<'all' | 'PAPER_SETTER' | 'EXAMINER'>('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'INVITED' | 'ACCEPTED'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Fetch all selections
  const { data: selections = [], isLoading, isFetching, error } = useQuery({
    queryKey: ['paper-setter-selections', subjectFilter, statusFilter],
    queryFn: () => paperSetterApi.getAllSelections({
      subject: subjectFilter !== 'all' ? subjectFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: paperSetterApi.deleteSelection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paper-setter-selections'] });
      toast.success('Selection deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete selection');
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this selection?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredSelections = selections.filter((s) => {
    if (typeFilter !== 'all' && s.selection_type !== typeFilter) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    if (status === 'ACCEPTED') {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500">Accepted</Badge>;
    }
    return <Badge variant="outline" className="text-orange-400 border-orange-400">Pending</Badge>;
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <RetryButton 
          queryKey={['paper-setter-selections']} 
          message="Failed to load data" 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Paper Setters & Examiners</h1>
        <div className="flex items-center gap-3">
          <RefreshTableButton queryKey={['paper-setter-selections', subjectFilter, statusFilter]} isFetching={isFetching} />
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" /> Add Selection
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Select Paper Setter / Examiner</DialogTitle>
              </DialogHeader>
              <AddSelectionForm onSuccess={() => {
                setShowAddDialog(false);
                queryClient.invalidateQueries({ queryKey: ['paper-setter-selections'] });
              }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex gap-4 items-end mb-6">
          <div className="flex-1">
            <label className="text-sm text-slate-400 mb-1 block">Type</label>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | 'PAPER_SETTER' | 'EXAMINER')}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="PAPER_SETTER">Paper Setters</SelectItem>
                <SelectItem value="EXAMINER">Examiners</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm text-slate-400 mb-1 block">Subject</label>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm text-slate-400 mb-1 block">Status</label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'INVITED' | 'ACCEPTED')}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="INVITED">Pending</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          /* Table */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Teacher Name</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Type</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Subject</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Class</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">School</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSelections.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">
                      No selections found
                    </td>
                  </tr>
                ) : (
                  filteredSelections.map((selection) => (
                    <tr key={selection.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-4 px-4 text-slate-300">
                        {selection.teacher?.name || 'N/A'}
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="outline" className={
                          selection.selection_type === 'PAPER_SETTER' 
                            ? 'text-purple-400 border-purple-400' 
                            : 'text-blue-400 border-blue-400'
                        }>
                          {selection.selection_type === 'PAPER_SETTER' ? 'Setter' : 'Examiner'}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-slate-300">{selection.subject}</td>
                      <td className="py-4 px-4 text-slate-300">Class {selection.class_level}</td>
                      <td className="py-4 px-4 text-slate-300 max-w-xs truncate">
                        {selection.teacher?.school?.name || 'N/A'}
                        {selection.teacher?.school?.district && (
                          <span className="text-slate-500"> - {selection.teacher.school.district.name}</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(selection.status)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {selection.official_order_url && (
                            <a 
                              href={selection.official_order_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors"
                              title="View Official Order"
                            >
                              <FileText className="h-5 w-5" />
                            </a>
                          )}
                          {selection.status === 'INVITED' && (
                            <button
                              onClick={() => handleDelete(selection.id)}
                              className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                              title="Delete"
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Add Selection Form Component
function AddSelectionForm({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<'search' | 'confirm'>('search');
  const [selectionType, setSelectionType] = useState<'PAPER_SETTER' | 'EXAMINER'>('EXAMINER');
  const [subject, setSubject] = useState('');
  const [classLevel, setClassLevel] = useState('10');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherSearchResult | null>(null);
  const [message, setMessage] = useState('');

  // Search teachers
  const { data: teachers = [], isLoading: searchLoading, refetch } = useQuery({
    queryKey: ['teacher-search', subject, classLevel, searchQuery],
    queryFn: () => paperSetterApi.searchTeachers(subject, classLevel, undefined, searchQuery),
    enabled: !!subject && step === 'search',
  });

  // Select mutation
  const selectMutation = useMutation({
    mutationFn: ({ teacherId, data }: { teacherId: string; data: { selectionType: 'PAPER_SETTER' | 'EXAMINER'; subject: string; classLevel: string; examYear: number; message?: string } }) => 
      paperSetterApi.selectTeacher(teacherId, data),
    onSuccess: () => {
      toast.success('Teacher selected successfully! Invitation sent.');
      onSuccess();
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to select teacher');
    },
  });

  const handleSearch = () => {
    if (subject) {
      refetch();
    }
  };

  const handleSelect = (teacher: TeacherSearchResult) => {
    setSelectedTeacher(teacher);
    setStep('confirm');
    // Set default message
    const typeLabel = selectionType === 'PAPER_SETTER' ? 'Paper Setter' : 'Examiner';
    setMessage(`You have been appointed as ${typeLabel} for ${subject} for HSLC Examination 2026. Please accept to proceed.`);
  };

  const handleConfirm = () => {
    if (!selectedTeacher) return;
    
    selectMutation.mutate({
      teacherId: selectedTeacher.id,
      data: {
        selectionType,
        subject,
        classLevel,
        examYear: 2026,
        message,
      },
    });
  };

  if (step === 'confirm' && selectedTeacher) {
    return (
      <div className="space-y-4">
        <div className="bg-slate-800 p-4 rounded-lg">
          <h3 className="font-medium text-white mb-2">Selected Teacher</h3>
          <p className="text-slate-300">{selectedTeacher.name}</p>
          <p className="text-slate-400 text-sm">{selectedTeacher.school?.name}</p>
          {selectedTeacher.schoolWarning && (
            <div className="mt-2 flex items-center gap-2 text-yellow-400 text-sm">
              <AlertTriangle className="h-4 w-4" />
              Another teacher from this school is already selected
            </div>
          )}
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1 block">Message to Teacher</label>
          <Textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
            rows={3}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('search')} className="flex-1">
            Back
          </Button>
          <Button 
            onClick={handleConfirm} 
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            disabled={selectMutation.isPending}
          >
            {selectMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
            ) : (
              'Confirm & Send Invitation'
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Type</label>
          <Select value={selectionType} onValueChange={(v) => setSelectionType(v as 'PAPER_SETTER' | 'EXAMINER')}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PAPER_SETTER">Paper Setter</SelectItem>
              <SelectItem value="EXAMINER">Examiner</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1 block">Subject *</label>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1 block">Class</label>
          <Select value={classLevel} onValueChange={setClassLevel}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {classLevels.map((c) => (
                <SelectItem key={c} value={c}>Class {c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Search teacher by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-slate-800 border-slate-700 text-white"
        />
        <Button onClick={handleSearch} disabled={!subject || searchLoading}>
          {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {/* Search Results */}
      <div className="max-h-64 overflow-y-auto space-y-2">
        {teachers.length === 0 && subject && (
          <p className="text-slate-500 text-center py-4">
            {searchLoading ? 'Searching...' : 'No teachers found. Try different filters.'}
          </p>
        )}
        {teachers.map((teacher) => (
          <div 
            key={teacher.id}
            className="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer"
            onClick={() => handleSelect(teacher)}
          >
            <div>
              <p className="text-white font-medium">{teacher.name}</p>
              <p className="text-slate-400 text-sm">{teacher.school?.name}</p>
              {teacher.schoolWarning && (
                <span className="text-yellow-400 text-xs flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3" /> School already has selection
                </span>
              )}
            </div>
            <Button size="sm" variant="outline">Select</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
