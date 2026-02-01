import { cookies } from 'next/headers';
import Dashboard from './Dashboard';

// Types
interface RoleStats {
    role: string;
    count: number;
}

interface ActiveUsersStats {
    active: number;
    total: number;
    inactive: number;
}

interface HelpdeskSummary {
    total: number;
    pending: number;
    resolved: number;
}

interface GenderStats {
    MALE: number;
    FEMALE: number;
    OTHER: number;
    total: number;
}

interface DistrictUserStats {
    district_id: string;
    district_name: string;
    user_count: number;
}

interface PendingActionsSummary {
    inactive_users: number;
    pending_form_approvals: number;
    pending_paper_setter: number;
    pending_helpdesk: number;
    total: number;
}

interface AuditLog {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    user_id: string | null;
    ip_address: string | null;
    created_at: string;
}

interface AuditLogsResponse {
    data: AuditLog[];
    total: number;
    hasMore: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

async function fetchWithAuth(endpoint: string, cookieStore: Awaited<ReturnType<typeof cookies>>) {
    const token = cookieStore.get('accessToken')?.value;

    const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        next: { revalidate: 60 }, // Revalidate every 60 seconds
    });

    if (!response.ok) {
        console.error(`Failed to fetch ${endpoint}:`, response.status);
        return null;
    }

    return response.json();
}

export default async function DashboardPage() {
    const cookieStore = await cookies();

    // Fetch all data in parallel
    const [roleStats, activeUsersStats, helpdeskSummary, genderStats, districtUserStats, pendingActions, auditLogs] = await Promise.all([
        fetchWithAuth('/admin/analytics/role-stats', cookieStore),
        fetchWithAuth('/admin/analytics/active-users', cookieStore),
        fetchWithAuth('/admin/analytics/helpdesk-summary', cookieStore),
        fetchWithAuth('/admin/analytics/gender-stats', cookieStore),
        fetchWithAuth('/admin/analytics/district-user-stats', cookieStore),
        fetchWithAuth('/admin/analytics/pending-actions', cookieStore),
        fetchWithAuth('/admin/audit-logs?limit=100&offset=0', cookieStore),
    ]);

    // console.log(districtUserStats)

    return (
        <Dashboard
            roleStats={roleStats || []}
            activeUsersStats={activeUsersStats || { active: 0, total: 0, inactive: 0 }}
            helpdeskSummary={helpdeskSummary || { total: 0, pending: 0, resolved: 0 }}
            genderStats={genderStats || { MALE: 0, FEMALE: 0, OTHER: 0, total: 0 }}
            districtUserStats={districtUserStats || []}
            pendingActions={pendingActions || { inactive_users: 0, pending_form_approvals: 0, pending_paper_setter: 0, pending_helpdesk: 0, total: 0 }}
            auditLogs={auditLogs?.data || []}
        />
    );
}

