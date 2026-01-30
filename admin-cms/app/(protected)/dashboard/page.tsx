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
    const [roleStats, activeUsersStats, helpdeskSummary, genderStats, districtUserStats] = await Promise.all([
        fetchWithAuth('/admin/analytics/role-stats', cookieStore),
        fetchWithAuth('/admin/analytics/active-users', cookieStore),
        fetchWithAuth('/admin/analytics/helpdesk-summary', cookieStore),
        fetchWithAuth('/admin/analytics/gender-stats', cookieStore),
        fetchWithAuth('/admin/analytics/district-user-stats', cookieStore),
    ]);

    return (
        <Dashboard
            roleStats={roleStats || []}
            activeUsersStats={activeUsersStats || { active: 0, total: 0, inactive: 0 }}
            helpdeskSummary={helpdeskSummary || { total: 0, pending: 0, resolved: 0 }}
            genderStats={genderStats || { MALE: 0, FEMALE: 0, OTHER: 0, total: 0 }}
            districtUserStats={districtUserStats || []}
        />
    );
}
