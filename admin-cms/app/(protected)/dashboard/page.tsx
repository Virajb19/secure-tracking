import { cookies } from 'next/headers';
import Dashboard from './Dashboard';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

async function fetchWithAuth(endpoint: string, cookieStore: Awaited<ReturnType<typeof cookies>>) {
    // Forward all cookies from the incoming request to the backend.
    // The accessToken HttpOnly cookie will be included, authenticating the request.
    const allCookies = cookieStore.getAll()
        .map(c => `${c.name}=${c.value}`)
        .join('; ');

    const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
            'Cookie': allCookies,
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

