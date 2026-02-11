import { cookies } from 'next/headers';
import Dashboard from './Dashboard';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

/**
 * Fetch data from the backend with cookie-based auth.
 * Accepts a pre-built cookie string (which may contain a refreshed accessToken).
 */
async function fetchWithAuth(endpoint: string, cookieString: string) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
            'Cookie': cookieString,
            'Content-Type': 'application/json',
        },
        next: { revalidate: 60 },
    });

    if (!response.ok) {
        console.error(`Failed to fetch ${endpoint}:`, response.status);
        return null;
    }

    return response.json();
}

/**
 * If accessToken is missing but refreshToken exists, call /auth/refresh once
 * and return an updated cookie string with the fresh accessToken.
 * This avoids 7 parallel refresh calls from each fetchWithAuth.
 */
async function getAuthCookies(cookieStore: Awaited<ReturnType<typeof cookies>>): Promise<string> {
    const allCookies = cookieStore.getAll();
    const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ');

    const hasAccessToken = allCookies.some(c => c.name === 'accessToken');
    const hasRefreshToken = allCookies.some(c => c.name === 'refreshToken');

    // accessToken exists → use cookies as-is
    if (hasAccessToken) return cookieString;

    // No refreshToken either → can't refresh, return as-is (will fail with 401)
    if (!hasRefreshToken) return cookieString;

    // accessToken expired but refreshToken exists → refresh once
    try {
        const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Cookie': cookieString,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        if (!refreshResponse.ok) {
            console.error('[Server] Token refresh failed:', refreshResponse.status);
            return cookieString;
        }

        // Extract fresh accessToken from Set-Cookie header
        const setCookies = refreshResponse.headers.getSetCookie?.() || [];
        const newAccessTokenCookie = setCookies.find(c => c.startsWith('accessToken='));

        if (newAccessTokenCookie) {
            const freshToken = newAccessTokenCookie.split(';')[0]; // "accessToken=xyz"
            return allCookies
                .filter(c => c.name !== 'accessToken')
                .map(c => `${c.name}=${c.value}`)
                .concat(freshToken)
                .join('; ');
        }
    } catch (err) {
        console.error('[Server] Token refresh error:', err);
    }

    return cookieString;
}

export default async function DashboardPage() {
    const cookieStore = await cookies();

    // Refresh token ONCE if needed, then use for all parallel fetches
    const authCookies = await getAuthCookies(cookieStore);

    const [roleStats, activeUsersStats, helpdeskSummary, genderStats, districtUserStats, pendingActions, auditLogs] = await Promise.all([
        fetchWithAuth('/admin/analytics/role-stats', authCookies),
        fetchWithAuth('/admin/analytics/active-users', authCookies),
        fetchWithAuth('/admin/analytics/helpdesk-summary', authCookies),
        fetchWithAuth('/admin/analytics/gender-stats', authCookies),
        fetchWithAuth('/admin/analytics/district-user-stats', authCookies),
        fetchWithAuth('/admin/analytics/pending-actions', authCookies),
        fetchWithAuth('/admin/audit-logs?limit=100&offset=0', authCookies),
    ]);

    // console.log(auditLogs)
    // await new Promise((resolve) => setTimeout(resolve, 10000));

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


