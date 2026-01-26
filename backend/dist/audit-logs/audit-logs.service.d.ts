import { AuditLog } from '@prisma/client';
import { PrismaService } from '../prisma';
export declare enum AuditAction {
    USER_LOGIN = "USER_LOGIN",
    USER_LOGIN_FAILED = "USER_LOGIN_FAILED",
    USER_REGISTERED = "USER_REGISTERED",
    DEVICE_ID_BOUND = "DEVICE_ID_BOUND",
    DEVICE_ID_MISMATCH = "DEVICE_ID_MISMATCH",
    USER_CREATED = "USER_CREATED",
    USER_UPDATED = "USER_UPDATED",
    USER_DEACTIVATED = "USER_DEACTIVATED",
    USER_ACTIVATED = "USER_ACTIVATED",
    TASK_CREATED = "TASK_CREATED",
    TASK_ASSIGNED = "TASK_ASSIGNED",
    TASK_STATUS_CHANGED = "TASK_STATUS_CHANGED",
    TASK_MARKED_SUSPICIOUS = "TASK_MARKED_SUSPICIOUS",
    TASK_COMPLETED = "TASK_COMPLETED",
    EVENT_UPLOADED = "EVENT_UPLOADED",
    EVENT_REJECTED_DUPLICATE = "EVENT_REJECTED_DUPLICATE",
    EVENT_REJECTED_TASK_LOCKED = "EVENT_REJECTED_TASK_LOCKED"
}
export interface CreateAuditLogParams {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    ipAddress?: string | null;
}
export declare class AuditLogsService {
    private readonly db;
    constructor(db: PrismaService);
    create(params: CreateAuditLogParams): Promise<AuditLog>;
    log(action: AuditAction | string, entityType: string, entityId: string | null, userId: string | null, ipAddress: string | null): Promise<AuditLog>;
    findAll(limit?: number, offset?: number): Promise<AuditLog[]>;
    findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
    findByUser(userId: string): Promise<AuditLog[]>;
}
