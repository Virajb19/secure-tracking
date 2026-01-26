'use client';

import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import { Search, Mail, Star, Download, Upload, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  useGetUsers, 
  useToggleUserStatus, 
  useGetDistricts, 
  useGetSchools, 
  useGetClasses, 
  useGetSubjects 
} from '@/services/user.service';
import { userStarsApi } from '@/services/paper-setter.service';
import { UserRole, User } from '@/types';
import { UserStatusToggle } from '@/components/UserStatusToggle';
import { DownloadXlsxButton } from '@/components/DownLoadXlxsButton';

type NotificationType = 'General' | 'Paper Setter' | 'Paper Checker' | 'Invitation' | 'Push Notification';

// Role display labels
const roleLabels: Record<string, string> = {
  [UserRole.SEBA_OFFICER]: 'SEBA Officers / Staff',
  [UserRole.HEADMASTER]: 'Headmasters',
  [UserRole.TEACHER]: 'Teachers',
  [UserRole.CENTER_SUPERINTENDENT]: 'Center Superintendent',
};

// Filter out admin roles for display
const displayRoles = [
  UserRole.SEBA_OFFICER,
  UserRole.HEADMASTER,
  UserRole.TEACHER,
  UserRole.CENTER_SUPERINTENDENT,
];

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading, isError, error } = useGetUsers();
  const { data: districts = [] } = useGetDistricts();
  const { data: schools = [] } = useGetSchools();
  const { data: classes = [] } = useGetClasses();
  const { data: subjects = [] } = useGetSubjects();
  
  // Fetch starred user IDs
  const { data: starredUserIds = [] } = useQuery({
    queryKey: ['starred-users'],
    queryFn: userStarsApi.getStarredIds,
  });
  
  // Toggle star mutation
  const toggleStarMutation = useMutation({
    mutationFn: (userId: string) => userStarsApi.toggleStar(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['starred-users'] });
    },
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showOnlyInactive, setShowOnlyInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [notificationType, setNotificationType] = useState<NotificationType>('General');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentUserForNotification, setCurrentUserForNotification] = useState<string | null>(null);

  // Filter out admin users and apply filters, sort inactive to end
  const filteredUsers = useMemo(() => {
    const filtered = users
      .filter((user) => {
        // Exclude ADMIN and SUPER_ADMIN
        if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
          return false;
        }
        
        const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        
        // District filter - check faculty's school's district
        const matchesDistrict = districtFilter === 'all' || 
          user.faculty?.school?.district_id === districtFilter;
        
        // School filter
        const matchesSchool = schoolFilter === 'all' || 
          user.faculty?.school_id === schoolFilter;
        
        // Class filter - check teaching assignments
        const matchesClass = classFilter === 'all' || 
          user.faculty?.teaching_assignments?.some(
            ta => ta.class_level === parseInt(classFilter)
          );
        
        // Subject filter - check teaching assignments
        const matchesSubject = subjectFilter === 'all' || 
          user.faculty?.teaching_assignments?.some(
            ta => ta.subject.toLowerCase() === subjectFilter.toLowerCase()
          );
        
        // Inactive filter
        const matchesInactiveFilter = !showOnlyInactive || !user.is_active;

        return matchesSearch && matchesRole && matchesDistrict && matchesSchool && matchesClass && matchesSubject && matchesInactiveFilter;
      })
      // Sort: active users first, inactive users last
      .sort((a, b) => {
        if (a.is_active === b.is_active) return 0;
        return a.is_active ? -1 : 1;
      });
    
    return filtered;
  }, [users, searchQuery, roleFilter, districtFilter, schoolFilter, classFilter, subjectFilter, showOnlyInactive]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Reset page when filters change
  const resetPage = () => setCurrentPage(1);

  // Helper to get school and district info
  const getSchoolAndDistrict = (user: User) => {
    if (user.faculty?.school) {
      const school = user.faculty.school;
      const district = school.district?.name || '';
      return `${school.name}${district ? ` - ${district}` : ''}`;
    }
    return '-';
  };

  // Helper to get classes and subjects
  const getClassesAndSubjects = (user: User) => {
    if (!user.faculty?.teaching_assignments?.length) return '-';
    
    const assignments = user.faculty.teaching_assignments;
    const formatted = assignments.map(ta => `Class ${ta.class_level} (${ta.subject})`);
    return formatted.join(', ');
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map((user) => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleToggleStar = (userId: string) => {
    toggleStarMutation.mutate(userId);
  };


  const openNotificationDialog = (userId?: string) => {
    if (userId) {
      setCurrentUserForNotification(userId);
    } else {
      setCurrentUserForNotification(null);
    }
    setNotificationDialogOpen(true);
  };

  const handleSendNotification = () => {
    console.log('Sending notification:', {
      type: notificationType,
      message: notificationMessage,
      file: selectedFile,
      recipients: currentUserForNotification ? [currentUserForNotification] : selectedUsers,
    });
    setNotificationDialogOpen(false);
    setNotificationMessage('');
    setSelectedFile(null);
    setNotificationType('General');
  };

  // Export users as CSV and trigger download
  const exportUsersAsCSV = (usersToExport: User[]) => {
    if (!usersToExport || usersToExport.length === 0) return;

    const headers = [
      'Name',
      'Phone',
      'Email',
      'Role',
      'School',
      'District',
      'ClassesAndSubjects',
      'Active',
    ];

    const rows = usersToExport.map((u) => {
      const schoolAndDistrict = getSchoolAndDistrict(u).replace(/,/g, '');
      const classesSubjects = getClassesAndSubjects(u).replace(/,/g, '');
      return [
        u.name,
        u.phone,
        u.email || '',
        u.role,
        schoolAndDistrict,
        u.faculty?.school?.district?.name || '',
        classesSubjects,
        u.is_active ? 'Yes' : 'No',
      ];
    });

    const csvContent = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-slate-400">Loading users...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-400 text-lg">Failed to load users</p>
          <p className="text-slate-500 text-sm mt-2">{error?.message || 'An error occurred'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Users</h1>
       <DownloadXlsxButton onDownload={() => exportUsersAsCSV(filteredUsers)}/>
      </div>

      {/* Filters Card */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder="Search by Name / Email / Phone Number"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[160px]">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Select User Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Select User Type</SelectItem>
                {displayRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleLabels[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[140px]">
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="All Districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {districts.map((district) => (
                  <SelectItem key={district.id} value={district.id}>
                    {district.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[180px]">
            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Select School" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Select School</SelectItem>
                {schools.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[120px]">
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls} value={cls.toString()}>
                    Class {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[120px]">
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button className="bg-blue-600 hover:bg-blue-700 px-6">
            <Search className="h-4 w-4" />
          </Button>

          <Button
            variant={showOnlyInactive ? "default" : "outline"}
            className={showOnlyInactive 
              ? "bg-red-600 hover:bg-red-700 text-white" 
              : "border-slate-600 text-black hover:bg-slate-700"
            }
            onClick={() => {
              setShowOnlyInactive(!showOnlyInactive);
              resetPage();
            }}
          >
            {showOnlyInactive ? 'Show All Users' : 'Show Inactive Only'}
          </Button>
        </div>

        {/* Users Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Sl No.</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Full Name</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Qualification</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Experience</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">School & District</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Classes & Subjects</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user, index) => (
                <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                        className="border-slate-600"
                      />
                      <span className="text-slate-300">{(currentPage - 1) * itemsPerPage + index + 1}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-blue-400 font-medium">{user.name}</td>
                  <td className="py-4 px-4 text-slate-300">
                    {user.faculty?.highest_qualification || '-'}
                  </td>
                  <td className="py-4 px-4 text-slate-300">
                    {user.faculty?.years_of_experience 
                      ? `${user.faculty.years_of_experience} Years` 
                      : '-'}
                  </td>
                  <td className="py-4 px-4 text-slate-300">
                    {getSchoolAndDistrict(user)}
                  </td>
                  <td className="py-4 px-4 text-slate-300">
                    {getClassesAndSubjects(user)}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                       <UserStatusToggle userId={user.id} isActive={user.is_active} />
                      <button
                        onClick={() => openNotificationDialog(user.id)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors"
                        title="Send Notification"
                      >
                        <Mail className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleToggleStar(user.id)}
                        disabled={toggleStarMutation.isPending}
                        className={`p-1.5 transition-colors disabled:opacity-50 ${
                          starredUserIds.includes(user.id)
                            ? 'text-yellow-400'
                            : 'text-slate-400 hover:text-yellow-400'
                        }`}
                        title={starredUserIds.includes(user.id) ? 'Remove from Favorites' : 'Mark as Favorite'}
                      >
                        <Star className={`h-5 w-5 ${starredUserIds.includes(user.id) ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {paginatedUsers.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No users found matching your criteria.
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700">
            <div className="text-sm text-slate-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={currentPage === pageNum 
                        ? "bg-blue-600 hover:bg-blue-700 text-white" 
                        : "border-slate-600 text-slate-300 hover:bg-slate-700"
                      }
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
              >
                Last
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Send Notification Dialog */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="bg-white text-slate-900 max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">Send Notification</DialogTitle>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                {currentUserForNotification ? '1 Selected' : `${selectedUsers.length} Selected`}
              </Badge>
            </div>
          </DialogHeader>

          {/* Notification Type Buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            {(['General', 'Paper Setter', 'Paper Checker', 'Invitation', 'Push Notification'] as NotificationType[]).map((type) => (
              <Button
                key={type}
                variant={notificationType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNotificationType(type)}
                className={notificationType === type 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                  : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }
              >
                {type}
              </Button>
            ))}
          </div>

          {/* Message Textarea */}
          <div className="mt-4">
            <Textarea
              placeholder="Message"
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
              className="min-h-[120px] border-slate-300 focus:border-slate-400"
            />
          </div>

          {/* File Upload */}
          <div className="mt-4">
            <label className="flex items-center gap-2 p-3 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <Upload className="h-5 w-5 text-slate-400" />
              <span className="text-slate-500">
                {selectedFile ? selectedFile.name : 'Select File (Only Image/PDF allowed)'}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button
              variant="outline"
              onClick={() => setNotificationDialogOpen(false)}
              className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Close
            </Button>
            <Button
              onClick={handleSendNotification}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white"
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
