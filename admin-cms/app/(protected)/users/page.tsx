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
  Search, 
  Mail, 
  Loader2, 
  Users, 
  Filter,
  Hash,
  Building2,
  GraduationCap,
  Briefcase,
  BookOpen,
  Bell,
  Eye,
  Check,
  X,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  User as UserIcon,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounceCallback, useLocalStorage } from 'usehooks-ts';
import { 
  useGetUsers, 
  useGetDistricts, 
  useGetSchools, 
  useGetClasses, 
  useGetSubjects,
  useApproveUser,
} from '@/services/user.service';
import { userStarsApi } from '@/services/paper-setter.service';
import { usersApi } from '@/services/api';
import { UserRole, User } from '@/types';
import { UserStatusToggle } from '@/components/UserStatusToggle';
import { DownloadXlsxButton } from '@/components/DownLoadXlxsButton';
import { StarButton } from '@/components/StarButton';
import { SendNotificationDialog } from '@/components/SendNotificationDialog';
import { RetryButton } from '@/components/RetryButton';
import { TableRowsSkeleton } from '@/components/TableSkeleton';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import { ResetDeviceButton } from '@/components/ResetDeviceButton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import CopyEmailButton from '@/components/CopyEmailButton';

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
  // Filter states (persisted in localStorage)
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter, removeRole] = useLocalStorage('users-roleFilter', 'all');
  const [districtFilter, setDistrictFilter, removeDistrict] = useLocalStorage('users-districtFilter', 'all');
  const [schoolFilter, setSchoolFilter] = useLocalStorage('users-schoolFilter', 'all');
  const [classFilter, setClassFilter] = useLocalStorage('users-classFilter', 'all');
  const [subjectFilter, setSubjectFilter] = useLocalStorage('users-subjectFilter', 'all');
  const [approvalStatusFilter, setApprovalStatusFilter] = useLocalStorage('users-approvalStatus', 'all');
  const [showOnlyInactive, setShowOnlyInactive] = useLocalStorage('users-showOnlyInactive', false);
  const [currentPage, setCurrentPage] = useLocalStorage('users-currentPage', 1);
  const itemsPerPage = 25;

  // Dialogs state
  const [userDetailDialogOpen, setUserDetailDialogOpen] = useState(false);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<User | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedUserForReject, setSelectedUserForReject] = useState<User | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Approve/Reject mutation
  const approveUserMutation = useApproveUser();
  
  // Debounce search input using useDebounceCallback
  const debouncedSetSearch = useDebounceCallback((value: string) => {
    setDebouncedSearch(value);
    setCurrentPage(1); // Reset to page 1 on search
  }, 500);

  // Build API filters
  const apiFilters = useMemo(() => {
    const filters: any = {
      page: currentPage,
      limit: itemsPerPage,
    };
    if (roleFilter !== 'all') filters.role = roleFilter;
    if (districtFilter !== 'all') filters.district_id = districtFilter;
    if (schoolFilter !== 'all') filters.school_id = schoolFilter;
    if (classFilter !== 'all') filters.class_level = parseInt(classFilter);
    if (subjectFilter !== 'all') filters.subject = subjectFilter;
    if (approvalStatusFilter !== 'all') filters.approval_status = approvalStatusFilter;
    if (debouncedSearch) filters.search = debouncedSearch;
    if (showOnlyInactive) filters.is_active = false;
    return filters;
  }, [currentPage, roleFilter, districtFilter, schoolFilter, classFilter, subjectFilter, approvalStatusFilter, debouncedSearch, showOnlyInactive]);

  
  // ❌ Never use useInfiniteQuery for textbook-style paginated tables
  //    (Page numbers: 1, 2, 3, jump to page N)
  //
  // ✅ useQuery → classic pagination
  //    - Server-side pagination (page, limit)
  //    - Direct page jumps
  //    - Predictable cache per page
  //
  // ✅ useInfiniteQuery → infinite scroll / "Load more"
  //    - Sequential data loading
  //    - Cursor-based pagination
  //    - Appends data instead of replacing
  //
  // Rule of thumb:
  // If users can jump to a specific page → useQuery
  // If users only scroll forward → useInfiniteQuery

  // Never use useInfiniteQuery for textbook paginated tables
  // useQuery -> textbook paginated tables
  // useInfiniteQuery -> infinite scroll / load more -> sequential data loading
  // Infinite scroll -> audit logs,( load more button OR auto load on scroll )

  // Never do overfetching Fetch what frontend needs
  
  // Fetch data with server-side pagination
  const { data: usersResponse, isLoading, isFetching, isError, error } = useGetUsers(apiFilters);
  const users = usersResponse?.data || [];
  const totalPages = usersResponse?.totalPages || 1;
  const totalUsers = usersResponse?.total || 0;

  const { data: districts = [] } = useGetDistricts();
  const { data: schools = [], isFetching: isFetchingSchools } = useGetSchools(districtFilter !== 'all' ? districtFilter : undefined);
  const { data: classes = [] } = useGetClasses();
  const { data: subjects = [] } = useGetSubjects();
  
  // Fetch starred user IDs
  const { data: starredUserIds = [] } = useQuery({
    queryKey: ['starred-users'],
    queryFn: userStarsApi.getStarredIds,
  });
  
  const queryClient = useQueryClient();

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [currentUserForNotification, setCurrentUserForNotification] = useState<string | null>(null);

  // Reset school filter when district changes
  useEffect(() => {
    setSchoolFilter('all');
  }, [districtFilter]);

  // Prefetch next page
  useEffect(() => {
    if (currentPage < totalPages) {
      const nextFilters = { ...apiFilters, page: currentPage + 1 };
      queryClient.prefetchQuery({
        queryKey: ['users', nextFilters],
        queryFn: () => usersApi.getAll(nextFilters),
      });
    }
  }, [currentPage, totalPages, apiFilters, queryClient]);

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
      setSelectedUsers(users.map((user) => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const openNotificationDialog = (userId?: string) => {
    setCurrentUserForNotification(userId || null);
    setNotificationDialogOpen(true);
  };

  // Handle approve user
  const handleApprove = async (userId: string) => {
    try {
      await approveUserMutation.mutateAsync({ userId, status: 'APPROVED' });
      toast.success('User approved successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to approve user');
    }
  };

  // Handle reject user
  const handleReject = async () => {
    if (!selectedUserForReject) return;
    
    try {
      await approveUserMutation.mutateAsync({ 
        userId: selectedUserForReject.id, 
        status: 'REJECTED',
        rejectionReason: rejectionReason || undefined
      });
      toast.success('User rejected');
      setRejectDialogOpen(false);
      setSelectedUserForReject(null);
      setRejectionReason('');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reject user');
    }
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

  // Define table loading/error content
  const tableContent = () => {
    if (isLoading || isFetching) {
      return (
        <TableRowsSkeleton rows={10} columns={8} />
      );
    }

    if (isError) {
      return (
        <tr>
          <td colSpan={8} className="py-16">
            <RetryButton 
              queryKey={['users', apiFilters]} 
              message="Failed to load users" 
              subMessage={typeof error?.message === 'string' ? error.message : undefined}
            />
          </td>
        </tr>
      );
    }

    if (users.length === 0) {
      return (
        <tr>
          <td colSpan={8} className="py-16">
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Users className="h-16 w-16 text-slate-700 mx-auto mb-4" />
              <div className="text-slate-400 text-lg">No users found</div>
              <p className="text-slate-500 text-sm mt-2">Try adjusting your filters</p>
            </motion.div>
          </td>
        </tr>
      );
    }

    return (
      <AnimatePresence>
        {users.map((user, index) => (
          <motion.tr 
            key={user.id} 
            custom={index}
            variants={tableRowVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="border-b border-slate-100 dark:border-slate-800/50 cursor-pointer"
          >
            <td className="py-4 px-5">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedUsers.includes(user.id)}
                  onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                  className="border-slate-400 dark:border-slate-500 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                />
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full text-sm font-mono">
                  {(currentPage - 1) * itemsPerPage + index + 1}
                </span>
              </div>
            </td>
            <td className="py-4 px-5">
              <span className="text-blue-600 dark:text-blue-400 font-medium">{user.name}</span>
            </td>
            <td className="py-4 px-5 text-slate-700 dark:text-slate-300">
              {user.faculty?.highest_qualification || '-'}
            </td>
            <td className="py-4 px-5 text-slate-700 dark:text-slate-300">
              {user.faculty?.years_of_experience 
                ? `${user.faculty.years_of_experience} Years` 
                : '-'}
            </td>
            <td className="py-4 px-5 text-slate-700 dark:text-slate-300 max-w-xs">
              <span className="line-clamp-2">{getSchoolAndDistrict(user)}</span>
            </td>
            <td className="py-4 px-5 text-slate-700 dark:text-slate-300 max-w-xs">
              <span className="line-clamp-2">{getClassesAndSubjects(user)}</span>
            </td>
            <td className="py-4 px-5">
              {user.faculty?.approval_status === 'PENDING' && (
                <Badge className="bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1 w-fit">
                  <Clock className="h-3 w-3" />
                  Pending
                </Badge>
              )}
              {user.faculty?.approval_status === 'APPROVED' && (
                <Badge className="bg-green-500/20 text-green-500 border border-green-500/30 flex items-center gap-1 w-fit">
                  <CheckCircle className="h-3 w-3" />
                  Approved
                </Badge>
              )}
              {user.faculty?.approval_status === 'REJECTED' && (
                <Badge className="bg-red-500/20 text-red-500 border border-red-500/30 flex items-center gap-1 w-fit">
                  <XCircle className="h-3 w-3" />
                  Rejected
                </Badge>
              )}
              {!user.faculty?.approval_status && (
                <span className="text-slate-500 text-sm">-</span>
              )}
            </td>
            <td className="py-4 px-5">
              <div className="flex items-center gap-2">
                {/* View Details Button */}
                <motion.button
                  onClick={() => {
                    setSelectedUserForDetail(user);
                    setUserDetailDialogOpen(true);
                  }}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-purple-500 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-all"
                  title="View Details"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Eye className="h-5 w-5" />
                </motion.button>
                
                {/* Approve/Reject buttons for PENDING users */}
                {user.faculty?.approval_status === 'PENDING' && (
                  <>
                    <motion.button
                      onClick={() => handleApprove(user.id)}
                      disabled={approveUserMutation.isPending}
                      className="p-2 text-green-500 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-all disabled:opacity-50"
                      title="Approve User"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Check className="h-5 w-5" />
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        setSelectedUserForReject(user);
                        setRejectDialogOpen(true);
                      }}
                      disabled={approveUserMutation.isPending}
                      className="p-2 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all disabled:opacity-50"
                      title="Reject User"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="h-5 w-5" />
                    </motion.button>
                  </>
                )}
                
                <UserStatusToggle userId={user.id} isActive={user.is_active} />
                <motion.button
                  onClick={() => openNotificationDialog(user.id)}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-all"
                  title="Send Notification"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Mail className="h-5 w-5" />
                </motion.button>
                <ResetDeviceButton userId={user.id} userName={user.name} />
                <StarButton 
                  userId={user.id} 
                  isStarred={starredUserIds.includes(user.id)} 
                />
              </div>
            </td>
          </motion.tr>
        ))}
      </AnimatePresence>
    );
  };

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
          <div className="flex items-center gap-4">
            <motion.div
              className="p-2 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Users className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Manage all users and their permissions</p>
            </div>
            <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 text-sm font-medium">
              {totalUsers} users
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <RefreshTableButton queryKey={['users', apiFilters]} isFetching={isFetching} />
            <DownloadXlsxButton 
              onDownload={() => exportUsersAsCSV(users)} 
              disabled={users.length === 0}
            />
          </div>
        </div>
      </motion.div>

      {/* Filters Card */}
      <motion.div 
        className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-xl"
        variants={cardVariants}
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Filters</h3>
        </div>

        {/* Search */}
        <motion.div className="mb-4" variants={itemVariants}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Search by Name / Email / Phone Number"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                debouncedSetSearch(e.target.value);
              }}
              className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 pl-10 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </motion.div>

        {/* Filter Dropdowns */}
        <motion.div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4" variants={itemVariants}>
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); resetPage(); }}>
            <SelectTrigger className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 transition-all">
              <SelectValue placeholder="User Type" />
            </SelectTrigger>
            <SelectContent className="bg-slate-100 dark:bg-slate-800 border-slate-700">
              <SelectItem value="all" className=" dark:text-white hover:bg-slate-700">All User Types</SelectItem>
              {displayRoles.map((role) => (
                <SelectItem key={role} value={role} className="text-black dark:text-white hover:bg-slate-700">
                  {roleLabels[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={districtFilter} onValueChange={(v) => { setDistrictFilter(v); resetPage(); }}>
            <SelectTrigger className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 transition-all">
              <SelectValue placeholder="District" />
            </SelectTrigger>
            <SelectContent className="bg-slate-100 dark:bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white hover:bg-slate-700">All Districts</SelectItem>
              {districts.map((district) => (
                <SelectItem key={district.id} value={district.id} className="text-white hover:bg-slate-700">
                  {district.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={schoolFilter} onValueChange={(v) => { setSchoolFilter(v); resetPage(); }} disabled={isFetchingSchools}>
            <SelectTrigger className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 transition-all">
              {isFetchingSchools ? (
                <span className="flex-center gap-2 text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading schools...
                </span>
              ) : (
                <SelectValue placeholder="School" />
              )}
            </SelectTrigger>
            <SelectContent className="bg-slate-100 dark:bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white hover:bg-slate-700">All Schools</SelectItem>
              {schools.map((school) => (
                <SelectItem key={school.id} value={school.id} className="text-white hover:bg-slate-700">
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); resetPage(); }}>
            <SelectTrigger className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 transition-all">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent className="bg-slate-100 dark:bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white hover:bg-slate-700">All Classes</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls} value={cls.toString()} className="text-white hover:bg-slate-700">
                  Class {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={subjectFilter} onValueChange={(v) => { setSubjectFilter(v); resetPage(); }}>
            <SelectTrigger className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 transition-all">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent className="bg-slate-100 dark:bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white hover:bg-slate-700">All Subjects</SelectItem>
              {subjects.map((subject) => {
                // Handle both string and object formats
                return (
                  <SelectItem key={subject} value={subject} className="text-white hover:bg-slate-700">
                    {subject}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={approvalStatusFilter} onValueChange={(v) => { setApprovalStatusFilter(v); resetPage(); }}>
            <SelectTrigger className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 transition-all">
              <SelectValue placeholder="Approval Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-100 dark:bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white hover:bg-slate-700">All Statuses</SelectItem>
              <SelectItem value="PENDING" className="text-white hover:bg-slate-700">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Pending
                </div>
              </SelectItem>
              <SelectItem value="APPROVED" className="text-white hover:bg-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Approved
                </div>
              </SelectItem>
              <SelectItem value="REJECTED" className="text-white hover:bg-slate-700">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Rejected
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <button
              className={`w-full p-2 rounded-lg duration-300 ${showOnlyInactive 
                ? "bg-linear-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white border border-transparent" 
                : "bg-blue-500 border-slate-300 dark:border-transparent hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700/50  dark:hover:text-white"
              }`}
              onClick={() => {
                setShowOnlyInactive(!showOnlyInactive);
                resetPage();
              }}
            >
              {showOnlyInactive ? 'Show All' : 'Show Inactive Only'}
            </button>
          </motion.div>
        </motion.div>

        {/* Bulk Actions */}
        <AnimatePresence mode="wait">
          {selectedUsers.length > 0 && (
            <motion.div 
              className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-between"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2">
                <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-sm font-medium">
                  {selectedUsers.length} selected
                </span>
              </div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => openNotificationDialog()}
                  className="bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/20"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Send Notification
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Users Table */}
      <motion.div 
        className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-xl"
        variants={cardVariants}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="border-slate-500 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                    />
                    <Hash className="h-4 w-4" />
                    Sl No.
                  </div>
                </th>
                <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">Full Name</th>
                <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                  <GraduationCap className="h-4 w-4 inline mr-1" />
                  Qualification
                </th>
                <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                  <Briefcase className="h-4 w-4 inline mr-1" />
                  Experience
                </th>
                <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                  <Building2 className="h-4 w-4 inline mr-1" />
                  School & District
                </th>
                <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                  <BookOpen className="h-4 w-4 inline mr-1" />
                  Classes & Subjects
                </th>
                <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Status
                </th>
                <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableContent()}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls - Always show, centered */}
        <motion.div 
          className="flex flex-col items-center gap-4 p-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30"
          variants={itemVariants}
        >
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isFetching}
              className="bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
            >
              ← Prev
            </Button>
            <div className="flex items-center gap-1 max-w-[250px] overflow-x-auto overflow-hidden scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
              {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((pageNum) => (
                  <motion.div key={pageNum} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      disabled={isFetching}
                      className={`flex-shrink-0 ${currentPage === pageNum 
                        ? "bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0 min-w-[36px]" 
                        : "bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white min-w-[36px]"
                      }`}
                    >
                      {pageNum}
                    </Button>
                  </motion.div>
                ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))}
              disabled={currentPage === (totalPages || 1) || isFetching}
              className="bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
            >
              Next →
            </Button>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Page <span className="text-slate-900 dark:text-white font-medium">{currentPage}</span> of{' '}
            <span className="text-slate-900 dark:text-white font-medium">{totalPages || 1}</span>
            {' '}• Showing {totalUsers > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
            {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers} users
          </div>
        </motion.div>
      </motion.div>

      {/* Send Notification Dialog */}
      <SendNotificationDialog
        open={notificationDialogOpen}
        onOpenChange={setNotificationDialogOpen}
        recipientUserIds={currentUserForNotification ? [currentUserForNotification] : selectedUsers}
        selectedUsers={
          currentUserForNotification 
            ? users.filter(u => u.id === currentUserForNotification)
            : users.filter(u => selectedUsers.includes(u.id))
        }
        singleUser={!!currentUserForNotification}
      />

      {/* User Detail Dialog */}
      <Dialog open={userDetailDialogOpen} onOpenChange={setUserDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              User Details
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Review complete user profile information before approving or rejecting
            </DialogDescription>
          </DialogHeader>
          
          {selectedUserForDetail && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-blue-500" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-500">Full Name</label>
                    <p className="text-slate-900 dark:text-white font-medium">{selectedUserForDetail.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Role</label>
                    <p className="text-slate-900 dark:text-white font-medium">{selectedUserForDetail.role}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Phone</label>
                    <p className="text-slate-900 dark:text-white font-medium flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {selectedUserForDetail.phone}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Email</label>
                     <div className='flex items-center gap-2'>
                       <p className="text-slate-900 dark:text-white font-medium">{selectedUserForDetail.email || '-'}</p>
                       {selectedUserForDetail.email && (
                          <CopyEmailButton email={selectedUserForDetail.email} />
                         )}
                     </div>
                  </div>
                </div>
              </div>

              {/* School Info */}
              {selectedUserForDetail.faculty?.school && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-green-500" />
                    School Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-500">School Name</label>
                      <p className="text-slate-900 dark:text-white font-medium">{selectedUserForDetail.faculty.school.name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">District</label>
                      <p className="text-slate-900 dark:text-white font-medium">{selectedUserForDetail.faculty.school.district?.name || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Registration Code</label>
                      <p className="text-slate-900 dark:text-white font-medium">{selectedUserForDetail.faculty.school.registration_code || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Professional Info */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-purple-500" />
                  Professional Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-500">Highest Qualification</label>
                    <p className="text-slate-900 dark:text-white font-medium">{selectedUserForDetail.faculty?.highest_qualification || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Years of Experience</label>
                    <p className="text-slate-900 dark:text-white font-medium">
                      {selectedUserForDetail.faculty?.years_of_experience ? `${selectedUserForDetail.faculty.years_of_experience} Years` : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Teaching Assignments */}
              {selectedUserForDetail.faculty?.teaching_assignments && selectedUserForDetail.faculty.teaching_assignments.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-orange-500" />
                    Teaching Assignments
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedUserForDetail.faculty.teaching_assignments.map((ta, idx) => (
                      <Badge key={idx} className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                        Class {ta.class_level} - {ta.subject}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Approval Status */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Approval Status
                </h3>
                <div className="flex items-center gap-4">
                  {selectedUserForDetail.faculty?.approval_status === 'PENDING' && (
                    <Badge className="bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Pending Approval
                    </Badge>
                  )}
                  {selectedUserForDetail.faculty?.approval_status === 'APPROVED' && (
                    <Badge className="bg-green-500/20 text-green-500 border border-green-500/30 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Approved
                    </Badge>
                  )}
                  {selectedUserForDetail.faculty?.approval_status === 'REJECTED' && (
                    <Badge className="bg-red-500/20 text-red-500 border border-red-500/30 flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Rejected
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 mt-4">
            {selectedUserForDetail?.faculty?.approval_status === 'PENDING' && (
              <>
                <Button
                  onClick={() => {
                    handleApprove(selectedUserForDetail.id);
                    setUserDetailDialogOpen(false);
                  }}
                  disabled={approveUserMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => {
                    setUserDetailDialogOpen(false);
                    setSelectedUserForReject(selectedUserForDetail);
                    setRejectDialogOpen(true);
                  }}
                  variant="destructive"
                  disabled={approveUserMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={() => setUserDetailDialogOpen(false)}
              className="border-slate-300 dark:border-slate-600"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject User Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Reject User
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to reject {selectedUserForReject?.name}? You can optionally provide a reason.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                Rejection Reason (Optional)
              </label>
              <Textarea
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason('');
              }}
              className="border-slate-300 dark:border-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={approveUserMutation.isPending}
              variant="destructive"
            >
              {approveUserMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Reject User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
