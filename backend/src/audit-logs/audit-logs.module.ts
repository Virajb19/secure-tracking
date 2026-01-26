import { Module, Global } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';

/**
 * Audit Logs Module.
 * Marked as @Global so AuditLogsService can be injected anywhere
 * without needing to import this module explicitly.
 * 
 * This is critical for ensuring all sensitive actions across
 * the application can log to the audit trail.
 */
@Global()
@Module({
    controllers: [AuditLogsController],
    providers: [AuditLogsService],
    exports: [AuditLogsService],
})
export class AuditLogsModule { }
