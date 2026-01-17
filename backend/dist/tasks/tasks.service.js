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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const task_entity_1 = require("./entities/task.entity");
const users_service_1 = require("../users/users.service");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
const enums_1 = require("../shared/enums");
let TasksService = class TasksService {
    constructor(taskRepository, usersService, auditLogsService) {
        this.taskRepository = taskRepository;
        this.usersService = usersService;
        this.auditLogsService = auditLogsService;
    }
    async create(createTaskDto, adminId, ipAddress) {
        const existingTask = await this.taskRepository.findOne({
            where: { sealed_pack_code: createTaskDto.sealed_pack_code },
        });
        if (existingTask) {
            throw new common_1.ConflictException(`Task with sealed pack code '${createTaskDto.sealed_pack_code}' already exists`);
        }
        const assignedUser = await this.usersService.findById(createTaskDto.assigned_user_id);
        if (assignedUser.role !== enums_1.UserRole.DELIVERY) {
            throw new common_1.BadRequestException('Tasks can only be assigned to DELIVERY users');
        }
        if (!assignedUser.is_active) {
            throw new common_1.BadRequestException('Cannot assign task to an inactive user');
        }
        const startTime = new Date(createTaskDto.start_time);
        const endTime = new Date(createTaskDto.end_time);
        if (endTime <= startTime) {
            throw new common_1.BadRequestException('End time must be after start time');
        }
        const task = this.taskRepository.create({
            sealed_pack_code: createTaskDto.sealed_pack_code,
            source_location: createTaskDto.source_location,
            destination_location: createTaskDto.destination_location,
            assigned_user_id: createTaskDto.assigned_user_id,
            start_time: startTime,
            end_time: endTime,
            status: enums_1.TaskStatus.PENDING,
        });
        const savedTask = await this.taskRepository.save(task);
        await this.auditLogsService.log(audit_logs_service_1.AuditAction.TASK_CREATED, 'Task', savedTask.id, adminId, ipAddress);
        await this.auditLogsService.log(audit_logs_service_1.AuditAction.TASK_ASSIGNED, 'Task', savedTask.id, adminId, ipAddress);
        return savedTask;
    }
    async findAll() {
        return this.taskRepository.find({
            order: { created_at: 'DESC' },
            relations: ['assigned_user'],
        });
    }
    async findMyTasks(userId) {
        return this.taskRepository.find({
            where: { assigned_user_id: userId },
            order: { created_at: 'DESC' },
        });
    }
    async findById(taskId) {
        const task = await this.taskRepository.findOne({
            where: { id: taskId },
            relations: ['assigned_user'],
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
        const task = await this.findById(taskId);
        const oldStatus = task.status;
        task.status = status;
        const updatedTask = await this.taskRepository.save(task);
        await this.auditLogsService.log(status === enums_1.TaskStatus.SUSPICIOUS
            ? audit_logs_service_1.AuditAction.TASK_MARKED_SUSPICIOUS
            : status === enums_1.TaskStatus.COMPLETED
                ? audit_logs_service_1.AuditAction.TASK_COMPLETED
                : audit_logs_service_1.AuditAction.TASK_STATUS_CHANGED, 'Task', taskId, userId, ipAddress);
        return updatedTask;
    }
    async resetForTesting(taskId, adminId, ipAddress) {
        const task = await this.findById(taskId);
        const now = new Date();
        const endTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        task.start_time = now;
        task.end_time = endTime;
        task.status = enums_1.TaskStatus.IN_PROGRESS;
        const updatedTask = await this.taskRepository.save(task);
        await this.auditLogsService.log(audit_logs_service_1.AuditAction.TASK_STATUS_CHANGED, 'Task', taskId, adminId, ipAddress);
        return updatedTask;
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(task_entity_1.Task)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        users_service_1.UsersService,
        audit_logs_service_1.AuditLogsService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map