import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Role-Based Route Protection Middleware
 * 
 * This middleware runs on every request and enforces:
 * 1. Authentication - user must have a valid role cookie
 * 2. Authorization - role must be allowed to access CMS
 * 3. Tab-level access - role must have permission for the specific route
 * 
 * Security Note: This is a client-side convenience check. Real security
 * is enforced by backend API guards that validate JWT tokens.
 */

// CMS roles that can access the admin panel
const CMS_ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUBJECT_COORDINATOR', 'ASSISTANT'];

// Tab path permissions per role
// '*' means all paths (full access)
const ROLE_TAB_ACCESS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: ['*'],
  SUBJECT_COORDINATOR: [
    '/dashboard',
    '/users',
    '/paper-setters',
    '/helpdesk',
    '/notifications',
    '/circulars',
  ],
  ASSISTANT: [
    '/dashboard',
    '/users',
    '/form-6',
    '/helpdesk',
    '/circulars',
  ],
};

/**
 * Check if a path matches any allowed paths for a role
 */
function canAccessPath(role: string, pathname: string): boolean {
  const allowed = ROLE_TAB_ACCESS[role];
  if (!allowed) return false;
  
  // Wildcard means all paths allowed
  if (allowed.includes('*')) return true;
  
  // Check if pathname matches any allowed path (including sub-routes)
  return allowed.some(tab => pathname === tab || pathname.startsWith(`${tab}/`));
}

/**
 * Get the default redirect path for a role
 */
function getDefaultPath(role: string): string {
  const allowed = ROLE_TAB_ACCESS[role];
  if (!allowed || allowed.length === 0) return '/login';
  if (allowed.includes('*')) return '/dashboard';
  return allowed[0];
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for:
  // - Auth routes (login page)
  // - API routes (handled by backend)
  // - Static files and Next.js internals
  // - Public assets
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // Static files
  ) {
    return NextResponse.next();
  }

  // Get role from cookie
  const role = request.cookies.get('userRole')?.value;

  // No role = not authenticated → redirect to login
  if (!role) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('reason', 'auth');
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role not allowed to access CMS → redirect to login with error
  if (!CMS_ALLOWED_ROLES.includes(role)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('reason', 'forbidden');
    loginUrl.searchParams.set('message', 'Your role cannot access the Admin CMS');
    return NextResponse.redirect(loginUrl);
  }

  // Check tab-level access for restricted roles
  if (!canAccessPath(role, pathname)) {
    // Redirect to the first allowed path for this role
    const defaultPath = getDefaultPath(role);
    console.log(`[Middleware] Role ${role} denied access to ${pathname}, redirecting to ${defaultPath}`);
    return NextResponse.redirect(new URL(defaultPath, request.url));
  }

  return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)' ,
  ],
};
