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
exports.TaskEventsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const task_event_entity_1 = require("./entities/task-event.entity");
const tasks_service_1 = require("../tasks/tasks.service");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
const enums_1 = require("../shared/enums");
let TaskEventsService = class TaskEventsService {
    constructor(taskEventRepository, tasksService, auditLogsService) {
        this.taskEventRepository = taskEventRepository;
        this.tasksService = tasksService;
        this.auditLogsService = auditLogsService;
    }
    async create(taskId, createDto, imageFile, userId, ipAddress) {
        const task = await this.tasksService.findById(taskId);
        if (task.assigned_user_id !== userId) {
            await this.auditLogsService.log('EVENT_UPLOAD_DENIED_NOT_ASSIGNED', 'TaskEvent', null, userId, ipAddress);
            throw new common_1.ForbiddenException('You are not assigned to this task');
        }
        if (task.status === enums_1.TaskStatus.COMPLETED) {
            await this.auditLogsService.log(audit_logs_service_1.AuditAction.EVENT_REJECTED_TASK_LOCKED, 'TaskEvent', null, userId, ipAddress);
            throw new common_1.BadRequestException('Task is already completed. No more events can be recorded.');
        }
        const existingEvent = await this.taskEventRepository.findOne({
            where: {
                task_id: taskId,
                event_type: createDto.event_type,
            },
        });
        if (existingEvent) {
            await this.auditLogsService.log(audit_logs_service_1.AuditAction.EVENT_REJECTED_DUPLICATE, 'TaskEvent', null, userId, ipAddress);
            throw new common_1.ConflictException(`Event type '${createDto.event_type}' has already been recorded for this task`);
        }
        if (!imageFile) {
            throw new common_1.BadRequestException('Image file is required');
        }
        const imageHash = this.calculateSHA256(imageFile.buffer);
        const serverTimestamp = new Date();
        const isWithinWindow = this.isWithinTimeWindow(serverTimestamp, task.start_time, task.end_time);
        const imageUrl = await this.saveImage(imageFile, taskId, createDto.event_type);
        const taskEvent = this.taskEventRepository.create({
            task_id: taskId,
            event_type: createDto.event_type,
            image_url: imageUrl,
            image_hash: imageHash,
            latitude: createDto.latitude,
            longitude: createDto.longitude,
            server_timestamp: serverTimestamp,
        });
        const savedEvent = await this.taskEventRepository.save(taskEvent);
        await this.updateTaskStatus(task, createDto.event_type, isWithinWindow, userId, ipAddress);
        await this.auditLogsService.log(audit_logs_service_1.AuditAction.EVENT_UPLOADED, 'TaskEvent', savedEvent.id, userId, ipAddress);
        return savedEvent;
    }
    calculateSHA256(buffer) {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }
    isWithinTimeWindow(timestamp, startTime, endTime) {
        return timestamp >= startTime && timestamp <= endTime;
    }
    async saveImage(file, taskId, eventType) {
        const uploadsDir = path.join(process.cwd(), 'uploads', taskId);
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const timestamp = Date.now();
        const extension = path.extname(file.originalname) || '.jpg';
        const filename = `${eventType}_${timestamp}${extension}`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, file.buffer);
        return `/uploads/${taskId}/${filename}`;
    }
    async updateTaskStatus(task, eventType, isWithinWindow, userId, ipAddress) {
        if (!isWithinWindow) {
            await this.tasksService.updateStatus(task.id, enums_1.TaskStatus.SUSPICIOUS, userId, ipAddress);
            return;
        }
        switch (eventType) {
            case enums_1.EventType.PICKUP:
                if (task.status === enums_1.TaskStatus.PENDING) {
                    await this.tasksService.updateStatus(task.id, enums_1.TaskStatus.IN_PROGRESS, userId, ipAddress);
                }
                break;
            case enums_1.EventType.FINAL:
                await this.tasksService.updateStatus(task.id, enums_1.TaskStatus.COMPLETED, userId, ipAddress);
                break;
            case enums_1.EventType.TRANSIT:
                break;
        }
    }
    async findByTaskId(taskId) {
        return this.taskEventRepository.find({
            where: { task_id: taskId },
            order: { server_timestamp: 'ASC' },
        });
    }
};
exports.TaskEventsService = TaskEventsService;
exports.TaskEventsService = TaskEventsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(task_event_entity_1.TaskEvent)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => tasks_service_1.TasksService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        tasks_service_1.TasksService,
        audit_logs_service_1.AuditLogsService])
], TaskEventsService);
//# sourceMappingURL=task-events.service.js.map