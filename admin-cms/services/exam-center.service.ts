import { api } from './api';
import { ExamCenter } from '@/types';

// ============================
// EXAM CENTERS API
// ============================

export interface ExamCenterFilterParams {
    page?: number;
    limit?: number;
    district_id?: string;
    search?: string;
    is_active?: boolean;
}

export interface PaginatedExamCentersResponse {
    data: ExamCenter[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/**
 * Exam Centers API
 * @see Backend Controller: backend/src/exam-centers/exam-centers.controller.ts
 * @see Backend Service:    backend/src/exam-centers/exam-centers.service.ts
 */
export const examCentersApi = {
    getAll: async (filters?: ExamCenterFilterParams): Promise<PaginatedExamCentersResponse> => {
        const params: Record<string, string> = {};
        if (filters?.page) params.page = String(filters.page);
        if (filters?.limit) params.limit = String(filters.limit);
        if (filters?.district_id) params.district_id = filters.district_id;
        if (filters?.search) params.search = filters.search;
        if (filters?.is_active !== undefined) params.is_active = String(filters.is_active);
        const response = await api.get<PaginatedExamCentersResponse>('/admin/exam-centers', { params });
        return response.data;
    },

    getById: async (id: string): Promise<{ success: boolean; data: ExamCenter }> => {
        const response = await api.get(`/admin/exam-centers/${id}`);
        return response.data;
    },

    create: async (schoolId: string): Promise<{ success: boolean; message: string; data: ExamCenter }> => {
        const response = await api.post('/admin/exam-centers', { school_id: schoolId });
        return response.data;
    },

    overrideSuperintendent: async (examCenterId: string, email: string): Promise<{ success: boolean; message: string; data: ExamCenter }> => {
        const response = await api.patch(`/admin/exam-centers/${examCenterId}/superintendent`, { email });
        return response.data;
    },

    deactivate: async (examCenterId: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.patch(`/admin/exam-centers/${examCenterId}/deactivate`);
        return response.data;
    },

    delete: async (examCenterId: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.delete(`/admin/exam-centers/${examCenterId}`);
        return response.data;
    },
};
