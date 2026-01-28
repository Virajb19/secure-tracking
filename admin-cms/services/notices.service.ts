import api from './api';

export type NoticeType = 'General' | 'Paper Setter' | 'Paper Checker' | 'Invitation' | 'Push Notification';

export interface Notice {
  id: string;
  title: string;
  content: string;
  type: NoticeType;
  subject: string | null;
  venue: string | null;
  event_time: string | null;
  event_date: string | null;
  published_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  school_id: string | null;
  created_by: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
  updated_at: string;
  school?: {
    id: string;
    name: string;
    district?: {
      id: string;
      name: string;
    };
  } | null;
  creator?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface CreateNoticePayload {
  title: string;
  content: string;
  type?: NoticeType;
  subject?: string;
  venue?: string;
  event_time?: string;
  event_date?: string;
  expires_at?: string;
  school_id?: string;
  created_by?: string;
  file_url?: string;
  file_name?: string;
}

export interface UpdateNoticePayload {
  title?: string;
  content?: string;
  type?: NoticeType;
  subject?: string;
  venue?: string;
  event_time?: string;
  event_date?: string;
  expires_at?: string;
  is_active?: boolean;
  school_id?: string;
  file_url?: string;
  file_name?: string;
}

export interface NoticesFilters {
  type?: string;
  school_id?: string;
}

const noticesApi = {
  /**
   * Get all notices with optional filters
   */
  getAll: async (filters?: NoticesFilters): Promise<Notice[]> => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.school_id) params.append('school_id', filters.school_id);
    
    const queryString = params.toString();
    const url = queryString ? `/admin/notices?${queryString}` : '/admin/notices';
    
    const response = await api.get(url);
    return response.data;
  },

  /**
   * Get a single notice by ID
   */
  getById: async (id: string): Promise<Notice> => {
    const response = await api.get(`/admin/notices/${id}`);
    return response.data;
  },

  /**
   * Create a new notice
   */
  create: async (payload: CreateNoticePayload): Promise<Notice> => {
    const response = await api.post('/admin/notices', payload);
    return response.data;
  },

  /**
   * Update an existing notice
   */
  update: async (id: string, payload: UpdateNoticePayload): Promise<Notice> => {
    const response = await api.patch(`/admin/notices/${id}`, payload);
    return response.data;
  },

  /**
   * Delete a notice
   */
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/admin/notices/${id}`);
    return response.data;
  },

  /**
   * Toggle active status of a notice
   */
  toggleActive: async (id: string): Promise<Notice> => {
    const response = await api.patch(`/admin/notices/${id}/toggle-active`);
    return response.data;
  },

  /**
   * Send notice to users (creates a global notice)
   */
  sendNotice: async (payload: {
    user_ids: string[];
    title: string;
    message: string;
    type: string;
    file_url?: string;
    file_name?: string;
    file_size?: number;
  }): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/admin/notices/send', payload);
    return response.data;
  },
};

export default noticesApi;
