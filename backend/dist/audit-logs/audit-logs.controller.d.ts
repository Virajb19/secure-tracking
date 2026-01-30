import { AuditLog } from '@prisma/client';
import { AuditLogsService } from './audit-logs.service';
interface AuditLogsResponse {
    data: AuditLog[];
    total: number;
    hasMore: boolean;
}
export declare class AuditLogsController {
    private readonly auditLogsService;
    constructor(auditLogsService: AuditLogsService);
    findAll(limit: number, offset: number): Promise<AuditLogsResponse>;
}
export {};
