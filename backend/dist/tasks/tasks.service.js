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
exports.TasksService = exports.TaskStatus = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_1 = require("../prisma");
const users_service_1 = require("../users/users.service");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
const notifications_service_1 = require("../notifications/notifications.service");
var client_2 = require("@prisma/client");
Object.defineProperty(exports, "TaskStatus", { enumerable: true, get: function () { return client_2.TaskStatus; } });
let TasksService = class TasksService {
    constructor(db, usersService, auditLogsService, notificationsService) {
        this.db = db;
        this.usersService = usersService;
        this.auditLogsService = auditLogsService;
        this.notificationsService = notificationsService;
    }
    async create(createTaskDto, adminId, ipAddress) {
        const existingTask = await this.db.task.findUnique({
            where: { sealed_pack_code: createTaskDto.sealed_pack_code },
        });
        if (existingTask) {
            throw new common_1.ConflictException(`Task with sealed pack code '${createTaskDto.sealed_pack_code}' already exists`);
        }
        const assignedUser = await this.usersService.findById(createTaskDto.assigned_user_id);
        if (assignedUser.role !== client_1.UserRole.SEBA_OFFICER) {
            throw new common_1.BadRequestException('Tasks can only be assigned to SEBA_OFFICER users');
        }
        if (!assignedUser.is_active) {
            throw new common_1.BadRequestException('Cannot assign task to an inactive user');
        }
        const startTime = new Date(createTaskDto.start_time);
        const endTime = new Date(createTaskDto.end_time);
        if (endTime <= startTime) {
            throw new common_1.BadRequestException('End time must be after start time');
        }
        const savedTask = await this.db.task.create({
            data: {
                sealed_pack_code: createTaskDto.sealed_pack_code,
                source_location: createTaskDto.source_location,
                destination_location: createTaskDto.destination_location,
                assigned_user_id: createTaskDto.assigned_user_id,
                start_time: startTime,
                end_time: endTime,
                exam_type: createTaskDto.exam_type || client_1.ExamType.REGULAR,
                status: client_1.TaskStatus.PENDING,
                pickup_latitude: createTaskDto.pickup_latitude,
                pickup_longitude: createTaskDto.pickup_longitude,
                destination_latitude: createTaskDto.destination_latitude,
                destination_longitude: createTaskDto.destination_longitude,
                geofence_radius: createTaskDto.geofence_radius ?? 100,
            },
        });
        await this.auditLogsService.log(audit_logs_service_1.AuditAction.TASK_CREATED, 'Task', savedTask.id, adminId, ipAddress);
        await this.auditLogsService.log(audit_logs_service_1.AuditAction.TASK_ASSIGNED, 'Task', savedTask.id, adminId, ipAddress);
        await this.notificationsService.notifyTaskAssigned(createTaskDto.assigned_user_id, createTaskDto.sealed_pack_code);
        return savedTask;
    }
    async findAll(examType, status, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const where = {};
        if (examType)
            where.exam_type = examType;
        if (status)
            where.status = status;
        const [data, total] = await Promise.all([
            this.db.task.findMany({
                where: Object.keys(where).length > 0 ? where : undefined,
                orderBy: { created_at: 'desc' },
                include: { assigned_user: true },
                skip,
                take: limit,
            }),
            this.db.task.count({
                where: Object.keys(where).length > 0 ? where : undefined,
            }),
        ]);
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findAllWithEvents(examType, date) {
        const whereClause = {};
        if (examType) {
            whereClause.exam_type = examType;
        }
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            whereClause.start_time = {
                gte: startOfDay,
                lte: endOfDay,
            };
        }
        return this.db.task.findMany({
            where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
            orderBy: { created_at: 'desc' },
            include: {
                assigned_user: true,
                events: {
                    orderBy: { created_at: 'asc' }
                }
            },
        });
    }
    async findMyTasks(userId) {
        return this.db.task.findMany({
            where: { assigned_user_id: userId },
            orderBy: { created_at: 'desc' },
        });
    }
    async findById(taskId) {
        const task = await this.db.task.findUnique({
            where: { id: taskId },
            include: { assigned_user: true },
        });
        if (!task) {
            throw new common_1.NotFoundException(`Task with ID '${taskId}' not found`);
        }
        return task;
    }
    async findByIdForUser(taskId, userId) {
        const task = await this.findById(taskId);
        if (task.assigned_user_id !== userId) {
            throw new common_1.ForbiddenException('You are not assigned to this task');
        }
        return task;
    }
    async updateStatus(taskId, status, userId, ipAddress) {
        const updatedTask = await this.db.task.update({
            where: { id: taskId },
            data: { status },
        });
        await this.auditLogsService.log(status === client_1.TaskStatus.SUSPICIOUS
            ? audit_logs_service_1.AuditAction.TASK_MARKED_SUSPICIOUS
            : status === client_1.TaskStatus.COMPLETED
                ? audit_logs_service_1.AuditAction.TASK_COMPLETED
                : audit_logs_service_1.AuditAction.TASK_STATUS_CHANGED, 'Task', taskId, userId, ipAddress);
        return updatedTask;
    }
    async resetForTesting(taskId, adminId, ipAddress) {
        const now = new Date();
        const endTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        const updatedTask = await this.db.task.update({
            where: { id: taskId },
            data: {
                start_time: now,
                end_time: endTime,
                status: client_1.TaskStatus.IN_PROGRESS,
            },
        });
        await this.auditLogsService.log(audit_logs_service_1.AuditAction.TASK_STATUS_CHANGED, 'Task', taskId, adminId, ipAddress);
        return updatedTask;
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        users_service_1.UsersService,
        audit_logs_service_1.AuditLogsService,
        notifications_service_1.NotificationsService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map