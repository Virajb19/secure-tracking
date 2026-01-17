import { AuditLogsService } from './audit-logs.service';
import { AuditLog } from './entities/audit-log.entity';
export declare class AuditLogsController {
    private readonly auditLogsService;
    constructor(auditLogsService: AuditLogsService);
    findAll(limit: number, offset: number): Promise<AuditLog[]>;
}
