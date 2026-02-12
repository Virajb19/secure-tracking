import { api } from './api';

// Types for Paper Setter
export interface BankDetailsInfo {
  id: string;
  account_number: string;
  account_name: string;
  ifsc_code: string;
  bank_name: string;
  branch_name?: string;
  upi_id?: string;
}

export interface PaperSetterSelection {
  id: string;
  coordinator_id: string;
  teacher_id: string;
  selection_type: 'PAPER_SETTER' | 'EXAMINER';
  subject: string;
  class_level: string;
  exam_year: number;
  status: 'INVITED' | 'ACCEPTED';
  official_order_url?: string;
  invitation_message?: string;
  accepted_at?: string;
  created_at: string;
  teacher?: {
    id: string;
    name: string;
    email?: string;
    phone: string;
    bank_details?: BankDetailsInfo | null;
    school?: {
      id: string;
      name: string;
      district?: { name: string };
    } | null;
  } | null;
  coordinator?: {
    id: string;
    name: string;
  };
}

export interface TeacherSearchResult {
  id: string;
  name: string;
  email?: string;
  phone: string;
  school?: {
    id: string;
    name: string;
    district?: { name: string };
  };
  schoolWarning?: boolean;
}

export interface SelectTeacherDto {
  selectionType: 'PAPER_SETTER' | 'EXAMINER';
  subject: string;
  classLevel: string;
  examYear: number;
  message?: string;
}

// ============================
// PAPER SETTER API
// ============================
export const paperSetterApi = {
  // Search teachers for selection
  searchTeachers: async (
    subject: string,
    classLevel?: string,
    districtId?: string,
    search?: string,
  ): Promise<TeacherSearchResult[]> => {
    const params = new URLSearchParams();
    params.append('subject', subject);
    if (classLevel) params.append('classLevel', classLevel);
    if (districtId) params.append('districtId', districtId);
    if (search) params.append('search', search);

    const response = await api.get(`/paper-setter/search-teachers?${params}`);
    return response.data;
  },

  // Select a teacher as paper setter/examiner
  selectTeacher: async (teacherId: string, data: SelectTeacherDto): Promise<PaperSetterSelection> => {
    const response = await api.post(`/paper-setter/select/${teacherId}`, data);
    return response.data;
  },

  // Get all selections (admin view)
  getAllSelections: async (filters?: {
    subject?: string;
    classLevel?: string;
    status?: 'INVITED' | 'ACCEPTED';
    selectionType?: 'PAPER_SETTER' | 'EXAMINER';
    search?: string;
    examYear?: number;
    page?: number;
    limit?: number;
  }): Promise<{
    data: PaperSetterSelection[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const params = new URLSearchParams();
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.classLevel) params.append('classLevel', filters.classLevel);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.selectionType) params.append('selectionType', filters.selectionType);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.examYear) params.append('examYear', filters.examYear.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(`/paper-setter/all?${params}`);
    return response.data;
  },

  // Get coordinator's selections
  getMySelections: async (): Promise<PaperSetterSelection[]> => {
    const response = await api.get('/paper-setter/my-selections');
    return response.data;
  },

  // Upload official order
  uploadOfficialOrder: async (selectionId: string, fileUrl: string): Promise<PaperSetterSelection> => {
    const response = await api.patch(`/paper-setter/${selectionId}/official-order`, { fileUrl });
    return response.data;
  },

  // Delete selection (before acceptance)
  deleteSelection: async (selectionId: string): Promise<void> => {
    await api.delete(`/paper-setter/${selectionId}`);
  },

  // Send reminder to teacher who hasn't accepted
  remindTeacher: async (selectionId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/paper-setter/remind/${selectionId}`);
    return response.data;
  },

  // Get stats
  getStats: async (): Promise<{
    totalInvited: number;
    totalAccepted: number;
    bySubject: Record<string, number>;
  }> => {
    const response = await api.get('/paper-setter/stats');
    return response.data;
  },

  // Get school-wise selections with pagination
  getSchoolWiseSelections: async (filters?: {
    subject?: string;
    status?: 'INVITED' | 'ACCEPTED';
    districtId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Array<{
      schoolId: string;
      schoolName: string;
      district: string;
      districtId: string;
      totalSubmissions: number;
      accepted: number;
      pending: number;
      subjects: string;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
  }> => {
    const params = new URLSearchParams();
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.districtId) params.append('districtId', filters.districtId);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(`/paper-setter/school-wise?${params}`);
    return response.data;
  },

  // Delete all selections for a school
  deleteSchoolSelections: async (schoolId: string): Promise<void> => {
    await api.delete(`/paper-setter/school/${schoolId}`);
  },

  // Check for duplicate selection (for warning when sending notices)
  checkDuplicateSelection: async (params: {
    schoolId: string;
    subject: string;
    classLevel: number;
    selectionType: 'PAPER_SETTER' | 'EXAMINER';
  }): Promise<{
    hasDuplicate: boolean;
    count: number;
    existingSelections: Array<{
      id: string;
      status: string;
      teacherName: string;
    }>;
  }> => {
    const queryParams = new URLSearchParams({
      schoolId: params.schoolId,
      subject: params.subject,
      classLevel: params.classLevel.toString(),
      selectionType: params.selectionType,
    });
    const response = await api.get(`/paper-setter/check-duplicate?${queryParams}`);
    return response.data;
  },
};

// ============================
// FORM SUBMISSIONS API
// ============================
export interface FormSubmission {
  id: string;
  school_id: string;
  submitted_by: string;
  form_type: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
  approved_by?: string;
  submitted_at?: string;
  approved_at?: string;
  created_at: string;
  school?: {
    id: string;
    name: string;
    registration_code: string;
    district?: { id: string; name: string };
  };
  submitter?: {
    name: string;
    phone: string;
  };
}

export const formSubmissionsApi = {
  // Get form submission stats for admin dashboard
  getStats: async (): Promise<{
    pending: number;
    approvedToday: number;
    rejectedToday: number;
    totalProcessed: number;
  }> => {
    const response = await api.get('/form-submissions/admin/stats');
    return response.data;
  },

  // Get all submissions (admin) with optional filters
  getAll: async (formType?: string, page = 1, limit = 20, districtId?: string, status?: string): Promise<{
    data: FormSubmission[];
    total: number;
  }> => {
    const params = new URLSearchParams();
    if (formType) params.append('formType', formType);
    if (districtId) params.append('districtId', districtId);
    if (status && status !== 'all') params.append('status', status);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await api.get(`/form-submissions/admin/all?${params}`);
    return response.data;
  },

  // Get pending submissions (admin)
  getPending: async (formType?: string, page = 1, limit = 20, districtId?: string): Promise<{
    data: FormSubmission[];
    total: number;
  }> => {
    const params = new URLSearchParams();
    if (formType) params.append('formType', formType);
    if (districtId) params.append('districtId', districtId);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await api.get(`/form-submissions/admin/pending?${params}`);
    return response.data;
  },

  // Approve submission
  approve: async (id: string): Promise<FormSubmission> => {
    const response = await api.post(`/form-submissions/${id}/approve`);
    return response.data;
  },

  // Reject submission
  reject: async (id: string, reason: string): Promise<FormSubmission> => {
    const response = await api.post(`/form-submissions/${id}/reject`, { reason });
    return response.data;
  },

  // Get submission by ID
  getById: async (id: string): Promise<FormSubmission> => {
    const response = await api.get(`/form-submissions/${id}`);
    return response.data;
  },

  // Get submissions by school
  getBySchool: async (schoolId: string): Promise<FormSubmission[]> => {
    const response = await api.get(`/form-submissions/school/${schoolId}`);
    return response.data;
  },

  // Get Form 6A details for a school
  getForm6ADetails: async (schoolId: string): Promise<{
    school: { name: string; registration_code: string; district?: { name: string } };
    staff: Array<{
      id: string;
      designation: string;
      highest_qualification: string;
      years_of_experience: number;
      user: { id: string; name: string; phone: string };
      teaching_assignments: Array<{ class_level: number; subject: string }>;
    }>;
  }> => {
    const response = await api.get(`/form-6/admin/6a/${schoolId}`);
    return response.data;
  },

  // Get Form 6B details for a school (non-teaching staff)
  getForm6BDetails: async (schoolId: string): Promise<{
    school: { name: string; registration_code: string; district?: { name: string } };
    staff: Array<{
      id: string;
      full_name: string;
      qualification: string;
      nature_of_work: string;
      years_of_service: number;
      phone: string;
    }>;
  }> => {
    const response = await api.get(`/form-6/admin/6b/${schoolId}`);
    return response.data;
  },

  // Get Form 6C Lower details for a school (student strength <= 10)
  getForm6CLowerDetails: async (schoolId: string): Promise<{
    school: { name: string; registration_code: string; district?: { name: string } };
    strengths: Array<{
      id: string;
      class_level: number;
      boys: number;
      girls: number;
      sections: number;
    }>;
  }> => {
    const response = await api.get(`/form-6/admin/6c-lower/${schoolId}`);
    return response.data;
  },

  // Get Form 6C Higher details for a school (student strength >= 11)
  getForm6CHigherDetails: async (schoolId: string): Promise<{
    school: { name: string; registration_code: string; district?: { name: string } };
    strengths: Array<{
      id: string;
      class_level: number;
      boys: number;
      girls: number;
      sections: number;
    }>;
  }> => {
    const response = await api.get(`/form-6/admin/6c-higher/${schoolId}`);
    return response.data;
  },

  // Get Form 6D details for a school (teaching staff 11-12)
  getForm6DDetails: async (schoolId: string): Promise<{
    school: { name: string; registration_code: string; district?: { name: string } };
    staff: Array<{
      id: string;
      designation: string;
      highest_qualification: string;
      years_of_experience: number;
      user: { id: string; name: string; phone: string };
      teaching_assignments: Array<{ class_level: number; subject: string }>;
    }>;
  }> => {
    const response = await api.get(`/form-6/admin/6d/${schoolId}`);
    return response.data;
  },
};

// ============================
// ANALYTICS API
// ============================
export interface TeacherStudentRatio {
  totalTeachers: number;
  totalStudents: number;
  ratio: string;
  ratioValue: number;
}

export interface DistrictRatio {
  districtId: string;
  districtName: string;
  totalTeachers: number;
  totalStudents: number;
  ratio: string;
  ratioValue: number;
}

export interface GenderStats {
  MALE: number;
  FEMALE: number;
  OTHER: number;
  total: number;
}

export interface DistrictUserStats {
  district_id: string;
  district_name: string;
  user_count: number;
}

export interface RoleStats {
  role: string;
  count: number;
}

export interface ActiveUsersStats {
  active: number;
  total: number;
  inactive: number;
}

export interface HelpdeskSummary {
  total: number;
  pending: number;
  resolved: number;
}

export const analyticsApi = {
  // Get overall teacher-student ratio
  getTeacherStudentRatio: async (): Promise<TeacherStudentRatio> => {
    const response = await api.get('/analytics/teacher-student-ratio');
    return response.data;
  },

  // Get district-wise ratios
  getDistrictRatios: async (): Promise<DistrictRatio[]> => {
    const response = await api.get('/analytics/district-ratios');
    return response.data;
  },

  // Get dashboard stats
  getDashboardStats: async (): Promise<{
    totalUsers: number;
    totalSchools: number;
    totalTeachers: number;
    totalStudents: number;
    teacherStudentRatio: string;
  }> => {
    const response = await api.get('/analytics/dashboard');
    return response.data;
  },

  // Get gender-wise user statistics
  getGenderStats: async (): Promise<GenderStats> => {
    const response = await api.get('/admin/analytics/gender-stats');
    return response.data;
  },

  // Get district-wise user statistics
  getDistrictUserStats: async (): Promise<DistrictUserStats[]> => {
    const response = await api.get('/admin/analytics/district-user-stats');
    return response.data;
  },

  // Get role-wise user statistics
  getRoleStats: async (): Promise<RoleStats[]> => {
    const response = await api.get('/admin/analytics/role-stats');
    return response.data;
  },

  // Get active users count
  getActiveUsersCount: async (): Promise<ActiveUsersStats> => {
    const response = await api.get('/admin/analytics/active-users');
    return response.data;
  },

  // Get helpdesk summary
  getHelpdeskSummary: async (): Promise<HelpdeskSummary> => {
    const response = await api.get('/admin/analytics/helpdesk-summary');
    return response.data;
  },
};

// ============================
// USER STARS API
// ============================
export const userStarsApi = {
  // Toggle star for a user
  toggleStar: async (userId: string): Promise<{ starred: boolean }> => {
    const response = await api.post(`/admin/user-stars/toggle/${userId}`);
    return response.data;
  },

  // Get starred user IDs
  getStarredIds: async (): Promise<string[]> => {
    const response = await api.get('/admin/user-stars/ids');
    return response.data?.starred_user_ids || [];
  },

  // Get starred users with details
  getStarredUsers: async (): Promise<any[]> => {
    const response = await api.get('/admin/user-stars');
    return response.data;
  },
};

// ============================
// BANK DETAILS API
// ============================
export interface BankDetails {
  id: string;
  user_id: string;
  account_number: string;
  account_holder_name: string;
  ifsc_code: string;
  bank_name: string;
  branch_name?: string;
  upi_id?: string;
}

export const bankDetailsApi = {
  // Get bank details for a user
  getByUserId: async (userId: string): Promise<BankDetails | null> => {
    try {
      const response = await api.get(`/bank-details/${userId}`);
      return response.data;
    } catch {
      return null;
    }
  },

  // Check if user has bank details
  hasBankDetails: async (userId: string): Promise<boolean> => {
    const response = await api.get(`/bank-details/${userId}/exists`);
    return response.data.exists;
  },
};
