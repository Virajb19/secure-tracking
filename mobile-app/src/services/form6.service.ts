/**
 * Form 6 Service
 * 
 * API service for Form 6 operations (Headmaster only).
 * Handles teaching staff, non-teaching staff, and student strength forms.
 */

import apiClient from '../api/client';
import { ApprovalStatus } from '../types';

// Types for Form 6
export interface TeachingStaff {
    id: string;
    user_id: string;
    school_id: string;
    faculty_type: string;
    qualification: string;
    experience_years: number;
    subjects_taught: string[];
    approval_status: ApprovalStatus;
    user: {
        id: string;
        name: string;
        profile_image_url?: string;
    };
    teaching_assignments: Array<{
        id: string;
        subject: string;
        class_level: number;
    }>;
}

export interface NonTeachingStaff {
    id: string;
    school_id: string;
    full_name: string;
    qualification: string;
    nature_of_work: string;
    years_of_service: number;
    phone: string;
}

export interface StudentStrength {
    id: string;
    school_id: string;
    class_level: number;
    boys: number;
    girls: number;
    sections: number;
}

export interface StudentStrengthInput {
    class_level: number;
    stream?: string;
    boys: number;
    girls: number;
    sections: number;
}

export interface NonTeachingStaffInput {
    full_name: string;
    qualification: string;
    nature_of_work: string;
    years_of_service: number;
    phone: string;
}

/**
 * Get teaching staff for Pre-Primary to Class 10 (Form 6A).
 */
export const getTeachingStaffLower = async (): Promise<TeachingStaff[]> => {
    const response = await apiClient.get<TeachingStaff[]>('/form-6/teaching-staff-lower');
    return response.data;
};

/**
 * Get teaching staff for Class 11 & 12 (Form 6D).
 */
export const getTeachingStaffHigher = async (): Promise<TeachingStaff[]> => {
    const response = await apiClient.get<TeachingStaff[]>('/form-6/teaching-staff-higher');
    return response.data;
};

/**
 * Verify or reject a faculty member.
 */
export const verifyFaculty = async (
    facultyId: string,
    status: ApprovalStatus
): Promise<TeachingStaff> => {
    const response = await apiClient.patch<TeachingStaff>(
        `/form-6/verify-faculty/${facultyId}`,
        { status }
    );
    return response.data;
};

/**
 * Submit Form 6A.
 */
export const submitForm6A = async (): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>('/form-6/submit-6a');
    return response.data;
};

/**
 * Get non-teaching staff (Form 6B).
 */
export const getNonTeachingStaff = async (): Promise<{
    staff: NonTeachingStaff | null;
    form_status: string;
}> => {
    const response = await apiClient.get('/form-6/non-teaching-staff');
    return response.data;
};

/**
 * Add non-teaching staff member.
 */
export const addNonTeachingStaff = async (
    data: NonTeachingStaffInput
): Promise<NonTeachingStaff> => {
    const response = await apiClient.post<NonTeachingStaff>(
        '/form-6/non-teaching-staff',
        data
    );
    return response.data;
};

/**
 * Update non-teaching staff member.
 */
export const updateNonTeachingStaff = async (
    staffId: string,
    data: NonTeachingStaffInput
): Promise<NonTeachingStaff> => {
    const response = await apiClient.patch<NonTeachingStaff>(
        `/form-6/non-teaching-staff/${staffId}`,
        data
    );
    return response.data;
};

/**
 * Submit Form 6B.
 */
export const submitForm6B = async (): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>('/form-6/submit-6b');
    return response.data;
};

/**
 * Get student strength for lower classes (Form 6C lower).
 */
export const getStudentStrengthLower = async (): Promise<{
    strengths: StudentStrength[];
    form_status: string;
}> => {
    const response = await apiClient.get('/form-6/student-strength-lower');
    return response.data;
};

/**
 * Submit student strength for lower classes.
 */
export const submitStudentStrengthLower = async (
    strengths: StudentStrengthInput[]
): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(
        '/form-6/submit-6c-lower',
        { strengths }
    );
    return response.data;
};

/**
 * Get student strength for higher classes (Form 6C higher).
 */
export const getStudentStrengthHigher = async (): Promise<{
    strengths: StudentStrength[];
    form_status: string;
}> => {
    const response = await apiClient.get('/form-6/student-strength-higher');
    return response.data;
};

/**
 * Submit student strength for higher classes.
 */
export const submitStudentStrengthHigher = async (
    strengths: StudentStrengthInput[]
): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(
        '/form-6/submit-6c-higher',
        { strengths }
    );
    return response.data;
};

/**
 * Submit Form 6D.
 */
export const submitForm6D = async (): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>('/form-6/submit-6d');
    return response.data;
};

/**
 * Get all staff at the headmaster's school.
 */
export const getSchoolStaffs = async (): Promise<TeachingStaff[]> => {
    const response = await apiClient.get<TeachingStaff[]>('/form-6/school-staffs');
    return response.data;
};
