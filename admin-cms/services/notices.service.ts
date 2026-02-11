import api from './api';
import { useQuery, useQueryClient, useMutation, useInfiniteQuery } from '@tanstack/react-query';

// NoticeType enum values match the backend Prisma enum
export type NoticeType = 'GENERAL' | 'PAPER_SETTER' | 'PAPER_CHECKER' | 'INVITATION' | 'PUSH_NOTIFICATION';

// Display labels for the enum values
export const noticeTypeLabels: Record<NoticeType, string> = {
  'GENERAL': 'General',
  'PAPER_SETTER': 'Paper Setter',
  'PAPER_CHECKER': 'Paper Checker',
  'INVITATION': 'Invitation',
  'PUSH_NOTIFICATION': 'Push Notification',
};

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
   * Get all notices with optional filters and pagination
   */
  getAll: async (filters?: NoticesFilters, limit = 50, offset = 0): Promise<{ data: Notice[]; total: number; hasMore: boolean }> => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.school_id) params.append('school_id', filters.school_id);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const queryString = params.toString();
    const url = queryString ? `/admin/notices?${queryString}` : '/admin/notices';

    const response = await api.get(url);
    // If backend returns array directly (old format), wrap it
    if (Array.isArray(response.data)) {
      return { data: response.data, total: response.data.length, hasMore: response.data.length === limit };
    }
    // Add hasMore field based on data length and total
    const data = response.data;
    return {
      data: data.data,
      total: data.total,
      hasMore: offset + data.data.length < data.total
    };
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

// React Query Hooks
export const NOTICES_QUERY_KEY = 'notices';

export interface NoticesResponse {
  data: Notice[];
  total: number;
  hasMore: boolean;
}

export function useGetNotices(filters?: NoticesFilters, limit = 50, offset = 0) {
  return useQuery({
    queryKey: [NOTICES_QUERY_KEY, filters, limit, offset],
    queryFn: () => noticesApi.getAll(filters, limit, offset),
  });
}

export function useGetNoticesInfinite(filters?: NoticesFilters, pageSize = 50) {
  return useInfiniteQuery<NoticesResponse>({
    queryKey: [NOTICES_QUERY_KEY, 'infinite', filters],
    queryFn: ({ pageParam = 0 }) => noticesApi.getAll(filters, pageSize, pageParam as number),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length * pageSize;
    },
    initialPageParam: 0,
    maxPages: 5,
    placeholderData: prev => prev
  });
}

export function useGetNoticeById(id: string) {
  return useQuery({
    queryKey: [NOTICES_QUERY_KEY, id],
    queryFn: () => noticesApi.getById(id),
    enabled: !!id,
  });
}

export function useDeleteNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => noticesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTICES_QUERY_KEY] });
    },
  });
}

export function useToggleNoticeActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => noticesApi.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTICES_QUERY_KEY] });
    },
  });
}
