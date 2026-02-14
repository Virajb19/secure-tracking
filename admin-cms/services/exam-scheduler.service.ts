import { api } from './api';
import { ExamSchedule } from '@/types';

// ============================
// EXAM SCHEDULER API
// ============================

export interface ExamScheduleFilterParams {
    date?: string;
    class?: string;
    category?: string;
    active?: boolean;
}

export interface CreateExamSchedulePayload {
    exam_date: string;
    class: string;
    subject: string;
    subject_category: string;
    exam_center_id: string;
    exam_start_time?: string;
    exam_end_time?: string;
}

export interface BulkCreateResult {
    created: number;
    skipped: number;
}

/**
 * Exam Scheduler API
 * @see Backend Controller: backend/src/exam-scheduler/exam-scheduler.controller.ts
 * @see Backend Service:    backend/src/exam-scheduler/exam-scheduler.service.ts
 */
export const examSchedulerApi = {
    getAll: async (filters?: ExamScheduleFilterParams): Promise<{ success: boolean; data: ExamSchedule[] }> => {
        const params: Record<string, string> = {};
        if (filters?.date) params.date = filters.date;
        if (filters?.class) params.class = filters.class;
        if (filters?.category) params.category = filters.category;
        if (filters?.active !== undefined) params.active = String(filters.active);
        const response = await api.get<{ success: boolean; data: ExamSchedule[] }>('/exam-scheduler', { params });
        return response.data;
    },

    getById: async (id: string): Promise<{ success: boolean; data: ExamSchedule }> => {
        const response = await api.get(`/exam-scheduler/${id}`);
        return response.data;
    },

    create: async (payload: CreateExamSchedulePayload): Promise<{ success: boolean; message: string; data: ExamSchedule }> => {
        const response = await api.post('/exam-scheduler', payload);
        return response.data;
    },

    createBulk: async (schedules: CreateExamSchedulePayload[]): Promise<{ success: boolean; message: string; data: BulkCreateResult }> => {
        const response = await api.post('/exam-scheduler/bulk', { schedules });
        return response.data;
    },

    update: async (id: string, payload: Partial<CreateExamSchedulePayload>): Promise<{ success: boolean; message: string; data: ExamSchedule }> => {
        const response = await api.patch(`/exam-scheduler/${id}`, payload);
        return response.data;
    },

    delete: async (id: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.delete(`/exam-scheduler/${id}`);
        return response.data;
    },
};
