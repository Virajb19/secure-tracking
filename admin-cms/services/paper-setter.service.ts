import { api } from './api';

// Types for Paper Setter
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
  accepted_at?: string;
  created_at: string;
  teacher?: {
    id: string;
    name: string;
    email?: string;
    phone: string;
    school?: {
      name: string;
      district?: { name: string };
    };
  };
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
    examYear?: number;
  }): Promise<PaperSetterSelection[]> => {
    const params = new URLSearchParams();
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.classLevel) params.append('classLevel', filters.classLevel);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.examYear) params.append('examYear', filters.examYear.toString());
    
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

  // Get stats
  getStats: async (): Promise<{
    totalInvited: number;
    totalAccepted: number;
    bySubject: Record<string, number>;
  }> => {
    const response = await api.get('/paper-setter/stats');
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
    name: string;
    district?: { name: string };
  };
  submitter?: {
    name: string;
    phone: string;
  };
}

export const formSubmissionsApi = {
  // Get pending submissions (admin)
  getPending: async (formType?: string, page = 1, limit = 20): Promise<{
    data: FormSubmission[];
    total: number;
  }> => {
    const params = new URLSearchParams();
    if (formType) params.append('formType', formType);
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
