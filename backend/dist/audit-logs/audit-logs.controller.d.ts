import { AuditLog } from '@prisma/client';
import { AuditLogsService } from './audit-logs.service';
export declare class AuditLogsController {
    private readonly auditLogsService;
    constructor(auditLogsService: AuditLogsService);
    findAll(limit: number, offset: number): Promise<AuditLog[]>;
}
