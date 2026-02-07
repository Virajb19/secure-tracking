import 'server-only';

import { cookies } from 'next/headers';
import { UserRole } from '@/types';

export interface ServerAuthData {
  isAuthenticated: boolean;
  role: UserRole | null;
}

/**
 * Server-side auth check for Next.js route protection.
 *
 * Checks both:
 * 1. userRole cookie (non-HttpOnly, set by client on login)
 * 2. accessToken cookie (HttpOnly, set by backend on login)
 *
 * This prevents users from manually setting userRole without a valid session.
 * The real security is still enforced by backend JWT validation on every API request.
 */
export async function getServerAuth(): Promise<ServerAuthData> {
  const cookieStore = await cookies();

  const role = cookieStore.get('userRole')?.value as UserRole | null;
  const accessToken = cookieStore.get('accessToken')?.value;

  console.log(accessToken ? 'Access token found in cookies' : 'No access token in cookies');

  // Must have both a valid role AND an accessToken cookie
  const isAuthenticated = Boolean(
    accessToken && (role === 'ADMIN' || role === 'SUPER_ADMIN')
  );

  return { isAuthenticated, role };
}
