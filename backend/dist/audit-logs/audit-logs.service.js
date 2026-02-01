"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogsService = exports.AuditAction = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../prisma");
var AuditAction;
(function (AuditAction) {
    AuditAction["USER_LOGIN"] = "USER_LOGIN";
    AuditAction["USER_LOGOUT"] = "USER_LOGOUT";
    AuditAction["USER_LOGIN_FAILED"] = "USER_LOGIN_FAILED";
    AuditAction["USER_REGISTERED"] = "USER_REGISTERED";
    AuditAction["DEVICE_ID_BOUND"] = "DEVICE_ID_BOUND";
    AuditAction["DEVICE_ID_MISMATCH"] = "DEVICE_ID_MISMATCH";
    AuditAction["USER_CREATED"] = "USER_CREATED";
    AuditAction["USER_UPDATED"] = "USER_UPDATED";
    AuditAction["USER_DEACTIVATED"] = "USER_DEACTIVATED";
    AuditAction["USER_ACTIVATED"] = "USER_ACTIVATED";
    AuditAction["PROFILE_PHOTO_UPDATED"] = "PROFILE_PHOTO_UPDATED";
    AuditAction["TASK_CREATED"] = "TASK_CREATED";
    AuditAction["TASK_ASSIGNED"] = "TASK_ASSIGNED";
    AuditAction["TASK_STATUS_CHANGED"] = "TASK_STATUS_CHANGED";
    AuditAction["TASK_MARKED_SUSPICIOUS"] = "TASK_MARKED_SUSPICIOUS";
    AuditAction["TASK_COMPLETED"] = "TASK_COMPLETED";
    AuditAction["EVENT_UPLOADED"] = "EVENT_UPLOADED";
    AuditAction["EVENT_REJECTED_DUPLICATE"] = "EVENT_REJECTED_DUPLICATE";
    AuditAction["EVENT_REJECTED_TASK_LOCKED"] = "EVENT_REJECTED_TASK_LOCKED";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
let AuditLogsService = class AuditLogsService {
    constructor(db) {
        this.db = db;
    }
    async create(params) {
        return this.db.auditLog.create({
            data: {
                user_id: params.userId ?? null,
                action: params.action,
                entity_type: params.entityType,
                entity_id: params.entityId ?? null,
                ip_address: params.ipAddress ?? null,
            },
        });
    }
    async log(action, entityType, entityId, userId, ipAddress) {
        return this.create({
            userId,
            action,
            entityType,
            entityId,
            ipAddress,
        });
    }
    async findAll(limit = 100, offset = 0) {
        const [data, total] = await Promise.all([
            this.db.auditLog.findMany({
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.db.auditLog.count(),
        ]);
        return {
            data,
            total,
            hasMore: offset + data.length < total,
        };
    }
    async findByEntity(entityType, entityId) {
        return this.db.auditLog.findMany({
            where: { entity_type: entityType, entity_id: entityId },
            orderBy: { created_at: 'desc' },
        });
    }
    async findByUser(userId) {
        return this.db.auditLog.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
        });
    }
};
exports.AuditLogsService = AuditLogsService;
exports.AuditLogsService = AuditLogsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], AuditLogsService);
//# sourceMappingURL=audit-logs.service.js.map