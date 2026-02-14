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
    SUBJECT_COORDINATOR = 'SUBJECT_COORDINATOR',  // CMS-only: limited access
    ASSISTANT = 'ASSISTANT',                      // CMS-only: limited access
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
    is_center_superintendent: boolean;
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
    refresh_token: string;
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
// SUBJECT TYPES
// ========================================

export interface Subject {
    id: string;
    name: string;
    class_level: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// ========================================
// EXAM CENTER TYPES
// ========================================

export interface ExamCenter {
    id: string;
    school_id: string;
    superintendent_id: string;
    assigned_by: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    school: School;
    superintendent: {
        id: string;
        name: string;
        email?: string;
        phone: string;
        role: UserRole;
        profile_image_url?: string;
    };
    assigned_admin?: {
        id: string;
        name: string;
        email?: string;
    };
    exam_schedules?: {
        subject: string;
        exam_date: string;
        class: string;
        subject_category: string;
    }[];
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

// ========================================
// EXAM SCHEDULE TYPES
// ========================================

export enum SubjectCategory {
    CORE = 'CORE',
    VOCATIONAL = 'VOCATIONAL',
}

export enum ExamClass {
    CLASS_10 = 'CLASS_10',
    CLASS_12 = 'CLASS_12',
}

export interface ExamSchedule {
    id: string;
    exam_date: string;
    class: ExamClass;
    subject: string;
    subject_category: SubjectCategory;
    exam_start_time: string;
    exam_end_time: string;
    exam_center_id: string;
    is_active: boolean;
    created_by?: string;
    created_at: string;
    updated_at: string;
    exam_center?: ExamCenter;
}

// ========================================
// EXAM TRACKER TYPES (QPT Mobile App)
// ========================================

export enum ExamTrackerEventType {
    TREASURY_ARRIVAL = 'TREASURY_ARRIVAL',
    CUSTODIAN_HANDOVER = 'CUSTODIAN_HANDOVER',
    OPENING_MORNING = 'OPENING_MORNING',
    PACKING_MORNING = 'PACKING_MORNING',
    DELIVERY_MORNING = 'DELIVERY_MORNING',
    OPENING_AFTERNOON = 'OPENING_AFTERNOON',
    PACKING_AFTERNOON = 'PACKING_AFTERNOON',
    DELIVERY_AFTERNOON = 'DELIVERY_AFTERNOON',
}

export interface ExamTrackerEvent {
    id: string;
    user_id: string;
    school_id: string;
    event_type: ExamTrackerEventType;
    exam_date: string;
    shift: string;
    image_url: string;
    image_hash: string;
    latitude: number;
    longitude: number;
    captured_at: string;
    submitted_at: string;
    user?: {
        id: string;
        name: string;
        phone: string;
    };
    school?: {
        id: string;
        name: string;
        registration_code: string;
    };
}
