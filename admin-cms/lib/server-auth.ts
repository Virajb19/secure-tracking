import 'server-only';

import { cookies } from 'next/headers';
import { UserRole } from '@/types';
import { isCmsRole } from './permissions';

export interface ServerAuthData {
  isAuthenticated: boolean;
  role: UserRole | null;
}

/**
 * Server-side auth check for Next.js route protection.
 *
 * Checks:
 * 1. userRole cookie (non-HttpOnly, set by client on login)
 * 2. accessToken OR refreshToken cookie (HttpOnly, set by backend on login)
 *
 * If the accessToken is expired but refreshToken exists, the user is still
 * considered authenticated. The client-side API interceptor will automatically
 * refresh the access token on the first API call.
 *
 * This prevents users from manually setting userRole without a valid session.
 * The real security is still enforced by backend JWT validation on every API request.
 * 
 * Supported CMS roles: SUPER_ADMIN, ADMIN, SUBJECT_COORDINATOR, ASSISTANT
 */
export async function getServerAuth(): Promise<ServerAuthData> {
  const cookieStore = await cookies();

  const role = cookieStore.get('userRole')?.value as UserRole | null;
  const accessToken = cookieStore.get('accessToken')?.value;
  const refreshToken = cookieStore.get('refreshToken')?.value;

  // Log for debugging
  console.log('Server Auth Check:', {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    role,
  });

  // Must have a valid role AND either an accessToken OR refreshToken cookie
  // If only refreshToken exists (accessToken expired), allow through - 
  // the client-side interceptor will refresh on first API call
  const hasValidSession = Boolean(accessToken || refreshToken);
  const hasValidRole = isCmsRole(role);  // Now supports SUBJECT_COORDINATOR and ASSISTANT
  const isAuthenticated = hasValidSession && hasValidRole;

  return { isAuthenticated, role };
}

