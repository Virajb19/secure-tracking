import { UserRole } from '@prisma/client';

/**
 * Role-Based Access Control Configuration
 * 
 * Defines which roles can access which parts of the system:
 * - Mobile App access
 * - Admin CMS access
 * - Specific CMS tab permissions
 */

// ========================================
// MOBILE APP ROLES
// ========================================
// Roles that can access the mobile app (field users)
export const MOBILE_APP_ROLES: UserRole[] = [
  UserRole.SEBA_OFFICER,
  UserRole.HEADMASTER,
  UserRole.TEACHER,
  UserRole.CENTER_SUPERINTENDENT,
];

// ========================================
// CMS ROLES
// ========================================
// Roles that can access the Admin CMS
export const CMS_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.SUBJECT_COORDINATOR,
  UserRole.ASSISTANT,
];

// ========================================
// CMS TAB PERMISSIONS
// ========================================
// Define which tabs each role can access in the Admin CMS
// '*' means all tabs (full access)
export const CMS_TAB_PERMISSIONS: Record<UserRole, string[]> = {
  // Full admin access
  [UserRole.SUPER_ADMIN]: ['*'],
  [UserRole.ADMIN]: ['*'],
  
  // Subject Coordinator: Dashboard, Users, Paper Setters, Helpdesk, Notifications, Circulars
  [UserRole.SUBJECT_COORDINATOR]: [
    'dashboard',
    'users',
    'paper-setters',
    'helpdesk',
    'notifications',
    'circulars',
  ],
  
  // Assistant: Dashboard, Users, Form 6, Helpdesk, Circulars
  [UserRole.ASSISTANT]: [
    'dashboard',
    'users',
    'form-6',
    'helpdesk',
    'circulars',
  ],
  
  // Mobile app roles - no CMS access
  [UserRole.SEBA_OFFICER]: [],
  [UserRole.HEADMASTER]: [],
  [UserRole.TEACHER]: [],
  [UserRole.CENTER_SUPERINTENDENT]: [],
};

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Check if a role can access the mobile app
 */
export function canAccessMobileApp(role: UserRole): boolean {
  return MOBILE_APP_ROLES.includes(role);
}

/**
 * Check if a role can access the Admin CMS
 */
export function canAccessCms(role: UserRole): boolean {
  return CMS_ROLES.includes(role);
}

/**
 * Check if a role can access a specific CMS tab
 */
export function canAccessCmsTab(role: UserRole, tab: string): boolean {
  const allowedTabs = CMS_TAB_PERMISSIONS[role] || [];
  
  // Wildcard means all tabs allowed
  if (allowedTabs.includes('*')) {
    return true;
  }
  
  return allowedTabs.includes(tab);
}

/**
 * Get all allowed CMS tabs for a role
 */
export function getAllowedCmsTabs(role: UserRole): string[] {
  return CMS_TAB_PERMISSIONS[role] || [];
}
