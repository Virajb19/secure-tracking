"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskEventsService = exports.EventType = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const prisma_1 = require("../prisma");
const tasks_service_1 = require("../tasks/tasks.service");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
var client_2 = require("@prisma/client");
Object.defineProperty(exports, "EventType", { enumerable: true, get: function () { return client_2.EventType; } });
let TaskEventsService = class TaskEventsService {
    constructor(db, tasksService, auditLogsService) {
        this.db = db;
        this.tasksService = tasksService;
        this.auditLogsService = auditLogsService;
    }
    async create(taskId, createDto, imageFile, userId, ipAddress) {
        const task = await this.tasksService.findById(taskId);
        if (task.assigned_user_id !== userId) {
            await this.auditLogsService.log('EVENT_UPLOAD_DENIED_NOT_ASSIGNED', 'TaskEvent', null, userId, ipAddress);
            throw new common_1.ForbiddenException('You are not assigned to this task');
        }
        if (task.status === client_1.TaskStatus.COMPLETED) {
            await this.auditLogsService.log(audit_logs_service_1.AuditAction.EVENT_REJECTED_TASK_LOCKED, 'TaskEvent', null, userId, ipAddress);
            throw new common_1.BadRequestException('Task is already completed. No more events can be recorded.');
        }
        const existingEvent = await this.db.taskEvent.findUnique({
            where: {
                task_id_event_type: {
                    task_id: taskId,
                    event_type: createDto.event_type,
                },
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
        const savedEvent = await this.db.taskEvent.create({
            data: {
                task_id: taskId,
                event_type: createDto.event_type,
                image_url: imageUrl,
                image_hash: imageHash,
                latitude: new library_1.Decimal(createDto.latitude),
                longitude: new library_1.Decimal(createDto.longitude),
                server_timestamp: serverTimestamp,
            },
        });
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
            await this.tasksService.updateStatus(task.id, client_1.TaskStatus.SUSPICIOUS, userId, ipAddress);
            return;
        }
        await this.checkRedFlag(task, eventType, userId, ipAddress);
        switch (eventType) {
            case client_1.EventType.PICKUP_POLICE_STATION:
                if (task.status === client_1.TaskStatus.PENDING) {
                    await this.tasksService.updateStatus(task.id, client_1.TaskStatus.IN_PROGRESS, userId, ipAddress);
                }
                break;
            case client_1.EventType.SUBMISSION_POST_OFFICE:
                await this.tasksService.updateStatus(task.id, client_1.TaskStatus.COMPLETED, userId, ipAddress);
                break;
            case client_1.EventType.ARRIVAL_EXAM_CENTER:
            case client_1.EventType.OPENING_SEAL:
            case client_1.EventType.SEALING_ANSWER_SHEETS:
                break;
        }
    }
    async checkRedFlag(task, eventType, userId, ipAddress) {
        if (eventType !== client_1.EventType.ARRIVAL_EXAM_CENTER) {
            return;
        }
        const pickupEvent = await this.db.taskEvent.findFirst({
            where: {
                task_id: task.id,
                event_type: client_1.EventType.PICKUP_POLICE_STATION,
            },
        });
        if (!pickupEvent)
            return;
        const now = new Date();
        const travelTimeMinutes = Math.round((now.getTime() - pickupEvent.server_timestamp.getTime()) / (1000 * 60));
        const expectedTime = task.expected_travel_time || 30;
        const threshold = expectedTime * 1.5;
        if (travelTimeMinutes > threshold) {
            await this.tasksService.updateStatus(task.id, client_1.TaskStatus.SUSPICIOUS, userId, ipAddress);
            await this.auditLogsService.log('RED_FLAG_TRAVEL_TIME', 'Task', task.id, userId, ipAddress);
        }
    }
    async getAllowedEventTypes(taskId) {
        const task = await this.tasksService.findById(taskId);
        const recordedEvents = await this.db.taskEvent.findMany({
            where: { task_id: taskId },
            select: { event_type: true },
        });
        const recordedTypes = new Set(recordedEvents.map(e => e.event_type));
        const allSteps = [
            client_1.EventType.PICKUP_POLICE_STATION,
            client_1.EventType.ARRIVAL_EXAM_CENTER,
            client_1.EventType.OPENING_SEAL,
            client_1.EventType.SEALING_ANSWER_SHEETS,
            client_1.EventType.SUBMISSION_POST_OFFICE,
        ];
        let allowedSteps = allSteps;
        if (task.is_double_shift && task.shift_type === 'AFTERNOON') {
            allowedSteps = [
                client_1.EventType.OPENING_SEAL,
                client_1.EventType.SEALING_ANSWER_SHEETS,
                client_1.EventType.SUBMISSION_POST_OFFICE,
            ];
        }
        return allowedSteps.filter(step => !recordedTypes.has(step));
    }
    async findByTaskId(taskId) {
        return this.db.taskEvent.findMany({
            where: { task_id: taskId },
            orderBy: { server_timestamp: 'asc' },
        });
    }
};
exports.TaskEventsService = TaskEventsService;
exports.TaskEventsService = TaskEventsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => tasks_service_1.TasksService))),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        tasks_service_1.TasksService,
        audit_logs_service_1.AuditLogsService])
], TaskEventsService);
//# sourceMappingURL=task-events.service.js.map