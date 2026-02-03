// Type definitions for Secure Tracking Admin CMS
// Aligned with backend entities

// ========================================
// ENUMS
// ========================================

export enum UserRole {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN = 'ADMIN',
    SEBA_OFFICER = 'SEBA_OFFICER',
    HEADMASTER = 'HEADMASTER',
    TEACHER = 'TEACHER',
    CENTER_SUPERINTENDENT = 'CENTER_SUPERINTENDENT',
}

export enum FacultyType {
    TEACHING = 'TEACHING',
    NON_TEACHING = 'NON_TEACHING',
}

export enum ApprovalStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

export enum Gender {
    MALE = 'MALE',
    FEMALE = 'FEMALE',
}

export enum TaskStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    SUSPICIOUS = 'SUSPICIOUS',
}

export enum EventType {
    PICKUP_POLICE_STATION = 'PICKUP_POLICE_STATION',
    ARRIVAL_EXAM_CENTER = 'ARRIVAL_EXAM_CENTER',
    OPENING_SEAL = 'OPENING_SEAL',
    SEALING_ANSWER_SHEETS = 'SEALING_ANSWER_SHEETS',
    SUBMISSION_POST_OFFICE = 'SUBMISSION_POST_OFFICE',
}

export enum ExamType {
    REGULAR = 'REGULAR',
    COMPARTMENTAL = 'COMPARTMENTAL',
}

// ========================================
// ENTITIES
// ========================================

export interface User {
    id: string;
    name: string;
    email?: string;
    phone: string;
    role: UserRole;
    gender?: Gender;
    profile_image_url?: string;
    is_active: boolean;
    device_id?: string;
    created_at: string;
    faculty?: Faculty;
}

export interface District {
    id: string;
    name: string;
    state: string;
    created_at: string;
}

export interface School {
    id: string;
    name: string;
    registration_code: string;
    district_id: string;
    district?: District;
    created_at: string;
}

export interface Faculty {
    id: string;
    user_id: string;
    school_id: string;
    faculty_type: FacultyType;
    designation: string;
    highest_qualification: string;
    years_of_experience: number;
    approval_status: ApprovalStatus;
    approved_by?: string;
    is_profile_locked: boolean;
    created_at: string;
    updated_at: string;
    school?: School;
    teaching_assignments?: TeachingAssignment[];
}

export interface TeachingAssignment {
    id: string;
    faculty_id: string;
    class_level: number;
    subject: string;
}

export interface Task {
    id: string;
    sealed_pack_code: string;
    source_location: string;
    destination_location: string;
    assigned_user_id: string;
    assigned_user: User;
    start_time: string;
    end_time: string;
    status: TaskStatus;
    exam_type: ExamType;
    created_at: string;
    events?: TaskEvent[];
}

export interface TaskEvent {
    id: string;
    task_id: string;
    event_type: EventType;
    image_url: string;
    image_hash: string;
    latitude: number;
    longitude: number;
    server_timestamp: string;
    created_at: string;
}

export interface AuditLog {
    id: string;
    user_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    ip_address: string | null;
    created_at: string;
}

// ========================================
// API RESPONSE TYPES
// ========================================

export interface LoginResponse {
    access_token: string;
    user: Partial<User> & { role: UserRole };
}

export interface AuthState {
    token: string | null;
    role: UserRole | null;
    isAuthenticated: boolean;
    loading: boolean;
}

// ========================================
// DTO TYPES
// ========================================

export interface CreateTaskDto {
    sealed_pack_code: string;
    source_location: string;
    destination_location: string;
    assigned_user_id: string;
    start_time: string;
    end_time: string;
    exam_type?: 'REGULAR' | 'COMPARTMENTAL';
}

// ========================================
// CIRCULAR TYPES
// ========================================

export interface Circular {
    id: string;
    circular_no: string;
    title: string;
    description?: string;
    file_url?: string;
    issued_by: string;
    issued_date: string;
    effective_date?: string;
    is_active: boolean;
    district_id?: string;
    school_id?: string;
    created_by?: string;
    created_at: string;
    updated_at: string;
    district?: { name: string };
    school?: { name: string };
    creator?: { name: string };
}

export interface CreateCircularDto {
    title: string;
    description?: string;
    issued_by: string;
    issued_date: string;
    effective_date?: string;
    district_id?: string;
    school_ids?: string[]; // Support multiple schools
}

// ========================================
// HELPDESK TYPES
// ========================================

export interface HelpdeskTicket {
    id: string;
    user_id: string;
    full_name: string;
    phone: string;
    message: string;
    is_resolved: boolean;
    created_at: string;
    user?: {
        name: string;
        phone: string;
        email?: string;
        role: UserRole;
    };
}
