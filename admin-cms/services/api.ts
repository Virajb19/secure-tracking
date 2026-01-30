'use client';

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { LoginResponse, Task, TaskEvent, AuditLog, User, CreateTaskDto, District, School, Circular, CreateCircularDto } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
console.log('API BASE URL:', API_BASE_URL);

const ADMIN_DEVICE_ID = process.env.NEXT_PUBLIC_DEVICE_ID || 'admin-web-001';

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {

    const url = error.config?.url || '';
    const isAuthlogin = url.includes('/auth/admin/login');

    if (error.response?.status === 401 && typeof window !== 'undefined' && !isAuthlogin) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userRole');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================
// AUTH API
// ============================
export const authApi = {
  // Admin-only login for CMS (only ADMIN/SUPER_ADMIN can login)
  login: async (email: string, password: string, phone?: string): Promise<LoginResponse> => {
        const payload: Record<string, string> = {
          email,
          password,
          device_id: ADMIN_DEVICE_ID,
        };
        // Only include phone if provided
        if (phone && phone.trim() !== '') {
          payload.phone = phone;
        }
        // Use admin-specific login endpoint
        const response = await api.post<LoginResponse>('/auth/admin/login', payload);
        return response.data;
      },
}

export interface UserFilterParams {
  page?: number;
  limit?: number;
  role?: string;
  district_id?: string;
  school_id?: string;
  class_level?: number;
  subject?: string;
  search?: string;
  is_active?: boolean;
}

export interface PaginatedUsersResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const usersApi = {
  getAll: async (filters?: UserFilterParams): Promise<PaginatedUsersResponse> => {
    const params: Record<string, string> = {};
    if (filters?.page) params.page = String(filters.page);
    if (filters?.limit) params.limit = String(filters.limit);
    if (filters?.role) params.role = filters.role;
    if (filters?.district_id) params.district_id = filters.district_id;
    if (filters?.school_id) params.school_id = filters.school_id;
    if (filters?.class_level) params.class_level = String(filters.class_level);
    if (filters?.subject) params.subject = filters.subject;
    if (filters?.search) params.search = filters.search;
    if (filters?.is_active !== undefined) params.is_active = String(filters.is_active);
    
    const response = await api.get<PaginatedUsersResponse>('/admin/users', { params });
    return response.data;
  },
  toggleStatus: async (userId: string, isActive: boolean): Promise<User> => {
    const response = await api.patch<User>(`/admin/users/${userId}/status`, {
      is_active: isActive,
    });
    return response.data;
  },
};

// ============================
// MASTER DATA API
// ============================
export const masterDataApi = {
  getDistricts: async (): Promise<District[]> => {
    const response = await api.get<District[]>('/admin/master-data/districts');
    return response.data;
  },
  getSchools: async (districtId?: string): Promise<School[]> => {
    const params = districtId ? { districtId } : {};
    const response = await api.get<School[]>('/admin/master-data/schools', { params });
    return response.data;
  },
  getClasses: async (): Promise<number[]> => {
    const response = await api.get<number[]>('/admin/master-data/classes');
    return response.data;
  },
  getSubjects: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/admin/master-data/subjects');
    return response.data;
  },
};

// ============================
// TASKS API
// ============================
export const tasksApi = {
  getAll: async (): Promise<Task[]> => {
    const response = await api.get<Task[]>('/admin/tasks');
    return response.data;
  },

  getById: async (taskId: string): Promise<Task> => {
    const response = await api.get<Task>(`/admin/tasks/${taskId}`);
    return response.data;
  },

  getTaskEvents: async (taskId: string): Promise<TaskEvent[]> => {
    const response = await api.get<TaskEvent[]>(
      `/admin/tasks/${taskId}/events`
    );
    return response.data;
  },

  create: async (data: CreateTaskDto): Promise<Task> => {
    const response = await api.post<Task>('/admin/tasks', data);
    return response.data;
  },
};

// ============================
// AUDIT LOGS API
// ============================
export interface AuditLogsResponse {
  data: AuditLog[];
  total: number;
  hasMore: boolean;
}

export const auditLogsApi = {
  getAll: async (limit = 50, offset = 0): Promise<AuditLogsResponse> => {
    const response = await api.get<AuditLogsResponse>('/admin/audit-logs', {
      params: { limit, offset },
    });
    return response.data;
  },
};

// ============================
// CIRCULARS API
// ============================
export interface CircularsResponse {
  data: Circular[];
  total: number;
  hasMore: boolean;
}

export const circularsApi = {
  getAll: async (limit = 20, offset = 0, search?: string): Promise<CircularsResponse> => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    if (search) params.append('search', search);
    
    const response = await api.get<CircularsResponse>(`/circulars?${params}`);
    return response.data;
  },
  getById: async (circularId: string): Promise<Circular> => {
    const response = await api.get<Circular>(`/circulars/${circularId}`);
    return response.data;
  },
  search: async (query: string): Promise<Circular[]> => {
    const response = await api.get<Circular[]>('/circulars/search', {
      params: { q: query },
    });
    return response.data;
  },
  create: async (data: CreateCircularDto, file?: File): Promise<Circular> => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('issued_by', data.issued_by);
    formData.append('issued_date', data.issued_date);
    if (data.description) formData.append('description', data.description);
    if (data.effective_date) formData.append('effective_date', data.effective_date);
    if (data.district_id) formData.append('district_id', data.district_id);
    // Support multiple school_ids
    if (data.school_ids && data.school_ids.length > 0) {
      data.school_ids.forEach((schoolId) => {
        formData.append('school_ids[]', schoolId);
      });
    }
    if (file) formData.append('file', file);
    
    const response = await api.post<Circular>('/circulars', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  delete: async (circularId: string, reason?: string): Promise<void> => {
    await api.delete(`/circulars/delete/${circularId}`, {
      data: { reason },
    });
  }
};

// ============================
// EVENTS API
// ============================
export type SchoolEventType = 'MEETING' | 'EXAM' | 'HOLIDAY' | 'SEMINAR' | 'WORKSHOP' | 'SPORTS' | 'CULTURAL' | 'OTHER';

export interface CreateEventPayload {
  title: string;
  description?: string;
  event_type: SchoolEventType;
  event_date: string;
  event_end_date?: string;
  event_time?: string;
  location?: string;
  activity_type?: string;
  male_participants?: number;
  female_participants?: number;
  district_id?: string;
  school_id?: string;
  invited_user_ids?: string[];
}

export interface EventFilterParams {
  from_date?: string;
  to_date?: string;
  district_id?: string;
  event_type?: SchoolEventType;
}

export interface EventWithStats {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_end_date: string | null;
  event_time: string | null;
  location: string | null;
  event_type: SchoolEventType;
  activity_type: string | null;
  flyer_url: string | null;
  male_participants: number | null;
  female_participants: number | null;
  is_active: boolean;
  created_at: string;
  creator: { id: string; name: string } | null;
  school: { id: string; name: string } | null;
  district: { id: string; name: string } | null;
  invitation_stats: {
    total: number;
    accepted: number;
    rejected: number;
    pending: number;
  };
}

export interface EventInvitation {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  rejection_reason: string | null;
  responded_at: string | null;
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    role: string;
  };
}

export interface EventDetails extends EventWithStats {
  invitations: EventInvitation[];
}

export interface InvitableUser {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: string;
  faculty: {
    school: {
      id: string;
      name: string;
      district: { id: string; name: string } | null;
    } | null;
  } | null;
}

export interface EventsResponse {
  data: EventWithStats[];
  total: number;
  hasMore: boolean;
}

export const eventsApi = {
  getAll: async (filters?: EventFilterParams, limit = 20, offset = 0): Promise<EventsResponse> => {
    const params: Record<string, string> = {};
    if (filters?.from_date) params.from_date = filters.from_date;
    if (filters?.to_date) params.to_date = filters.to_date;
    if (filters?.district_id) params.district_id = filters.district_id;
    if (filters?.event_type) params.event_type = filters.event_type;
    params.limit = limit.toString();
    params.offset = offset.toString();
    
    const response = await api.get<EventsResponse>('/admin/events', { params });
    return response.data;
  },
  getById: async (eventId: string): Promise<EventDetails> => {
    const response = await api.get<EventDetails>(`/admin/events/${eventId}`);
    return response.data;
  },
  create: async (data: CreateEventPayload, flyer?: File): Promise<EventDetails> => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('event_type', data.event_type);
    formData.append('event_date', data.event_date);
    if (data.description) formData.append('description', data.description);
    if (data.event_time) formData.append('event_time', data.event_time);
    if (data.location) formData.append('location', data.location);
    if (data.district_id) formData.append('district_id', data.district_id);
    if (data.school_id) formData.append('school_id', data.school_id);
    if (data.invited_user_ids && data.invited_user_ids.length > 0) {
      formData.append('invited_user_ids', JSON.stringify(data.invited_user_ids));
    }
    if (flyer) formData.append('flyer', flyer);

    const response = await api.post<EventDetails>('/admin/events', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  update: async (eventId: string, data: Partial<CreateEventPayload>, flyer?: File): Promise<EventDetails> => {
    const formData = new FormData();
    if (data.title) formData.append('title', data.title);
    if (data.event_type) formData.append('event_type', data.event_type);
    if (data.event_date) formData.append('event_date', data.event_date);
    if (data.description !== undefined) formData.append('description', data.description || '');
    if (data.event_time !== undefined) formData.append('event_time', data.event_time || '');
    if (data.location !== undefined) formData.append('location', data.location || '');
    if (flyer) formData.append('flyer', flyer);

    const response = await api.patch<EventDetails>(`/admin/events/${eventId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  delete: async (eventId: string): Promise<void> => {
    await api.delete(`/admin/events/${eventId}`);
  },
  inviteUsers: async (eventId: string, userIds: string[]): Promise<{ invited_count: number; already_invited_count: number }> => {
    const response = await api.post(`/admin/events/${eventId}/invite`, { user_ids: userIds });
    return response.data;
  },
  getInvitableUsers: async (filters?: {
    role?: string;
    district_id?: string;
    school_id?: string;
    exclude_event_id?: string;
  }): Promise<InvitableUser[]> => {
    const response = await api.get<InvitableUser[]>('/admin/events/invitable-users', { params: filters });
    return response.data;
  },
};

export default api;
