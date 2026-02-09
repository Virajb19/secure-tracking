import { SetMetadata } from '@nestjs/common';
import { CMS_TAB_KEY } from '../guards/cms-access.guard';

/**
 * Decorator to specify which CMS tab an endpoint belongs to.
 * Used in conjunction with CmsAccessGuard for tab-level access control.
 * 
 * Available tabs:
 * - 'dashboard' - Home/Dashboard
 * - 'users' - User management
 * - 'form-6' - Form 6 submissions
 * - 'circulars' - Circulars management
 * - 'events' - Events management
 * - 'tasks' - Task management
 * - 'notifications' - Notifications
 * - 'audit-logs' - Audit logs
 * - 'helpdesk' - Helpdesk/Support
 * - 'paper-setters' - Paper setters/checkers
 * - 'question-paper-tracking' - QPT
 * 
 * @example
 * @CmsTab('users')
 * @Controller('users')
 * export class UsersController { ... }
 */
export const CmsTab = (tab: string) => SetMetadata(CMS_TAB_KEY, tab);
