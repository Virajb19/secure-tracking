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
exports.TaskEventsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const task_events_service_1 = require("./task-events.service");
const create_task_event_dto_1 = require("./dto/create-task-event.dto");
const guards_1 = require("../shared/guards");
const decorators_1 = require("../shared/decorators");
const enums_1 = require("../shared/enums");
const user_entity_1 = require("../users/entities/user.entity");
const multerOptions = {
    storage: (0, multer_1.memoryStorage)(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, callback) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            callback(null, true);
        }
        else {
            callback(new common_1.BadRequestException('Only JPEG, PNG, and WebP images are allowed'), false);
        }
    },
};
let TaskEventsController = class TaskEventsController {
    constructor(taskEventsService) {
        this.taskEventsService = taskEventsService;
    }
    async create(taskId, createTaskEventDto, image, currentUser, request) {
        if (!image) {
            throw new common_1.BadRequestException('Image file is required');
        }
        const ipAddress = this.extractIpAddress(request);
        return this.taskEventsService.create(taskId, createTaskEventDto, image, currentUser.id, ipAddress);
    }
    async findByTaskId(taskId, currentUser) {
        return this.taskEventsService.findByTaskId(taskId);
    }
    extractIpAddress(request) {
        const forwarded = request.headers['x-forwarded-for'];
        if (forwarded) {
            const forwardedIps = Array.isArray(forwarded) ? forwarded[0] : forwarded;
            return forwardedIps.split(',')[0].trim();
        }
        return request.ip || request.socket.remoteAddress || 'unknown';
    }
};
exports.TaskEventsController = TaskEventsController;
__decorate([
    (0, common_1.Post)(':taskId/events'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', multerOptions)),
    __param(0, (0, common_1.Param)('taskId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, decorators_1.CurrentUser)()),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_task_event_dto_1.CreateTaskEventDto, Object, user_entity_1.User, Object]),
    __metadata("design:returntype", Promise)
], TaskEventsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':taskId/events'),
    __param(0, (0, common_1.Param)('taskId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TaskEventsController.prototype, "findByTaskId", null);
exports.TaskEventsController = TaskEventsController = __decorate([
    (0, common_1.Controller)('api/tasks'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard, guards_1.RolesGuard),
    (0, decorators_1.Roles)(enums_1.UserRole.DELIVERY),
    __metadata("design:paramtypes", [task_events_service_1.TaskEventsService])
], TaskEventsController);
//# sourceMappingURL=task-events.controller.js.map