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
exports.DeliveryTasksController = exports.AdminTasksController = void 0;
const common_1 = require("@nestjs/common");
const tasks_service_1 = require("./tasks.service");
const create_task_dto_1 = require("./dto/create-task.dto");
const guards_1 = require("../shared/guards");
const decorators_1 = require("../shared/decorators");
const enums_1 = require("../shared/enums");
const user_entity_1 = require("../users/entities/user.entity");
const task_events_service_1 = require("../task-events/task-events.service");
let AdminTasksController = class AdminTasksController {
    constructor(tasksService, taskEventsService) {
        this.tasksService = tasksService;
        this.taskEventsService = taskEventsService;
    }
    async create(createTaskDto, currentUser, request) {
        const ipAddress = this.extractIpAddress(request);
        return this.tasksService.create(createTaskDto, currentUser.id, ipAddress);
    }
    async findAll() {
        return this.tasksService.findAll();
    }
    async findOne(taskId) {
        return this.tasksService.findById(taskId);
    }
    async findTaskEvents(taskId) {
        return this.taskEventsService.findByTaskId(taskId);
    }
    async resetForTesting(taskId, currentUser, request) {
        const ipAddress = this.extractIpAddress(request);
        return this.tasksService.resetForTesting(taskId, currentUser.id, ipAddress);
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
exports.AdminTasksController = AdminTasksController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, decorators_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_task_dto_1.CreateTaskDto,
        user_entity_1.User, Object]),
    __metadata("design:returntype", Promise)
], AdminTasksController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminTasksController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':taskId'),
    __param(0, (0, common_1.Param)('taskId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminTasksController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':taskId/events'),
    __param(0, (0, common_1.Param)('taskId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminTasksController.prototype, "findTaskEvents", null);
__decorate([
    (0, common_1.Patch)(':taskId/reset-for-testing'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('taskId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, decorators_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User, Object]),
    __metadata("design:returntype", Promise)
], AdminTasksController.prototype, "resetForTesting", null);
exports.AdminTasksController = AdminTasksController = __decorate([
    (0, common_1.Controller)('api/admin/tasks'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard, guards_1.RolesGuard),
    (0, decorators_1.Roles)(enums_1.UserRole.ADMIN),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => task_events_service_1.TaskEventsService))),
    __metadata("design:paramtypes", [tasks_service_1.TasksService,
        task_events_service_1.TaskEventsService])
], AdminTasksController);
let DeliveryTasksController = class DeliveryTasksController {
    constructor(tasksService) {
        this.tasksService = tasksService;
    }
    async findMyTasks(currentUser) {
        return this.tasksService.findMyTasks(currentUser.id);
    }
    async findOne(taskId, currentUser) {
        return this.tasksService.findByIdForUser(taskId, currentUser.id);
    }
};
exports.DeliveryTasksController = DeliveryTasksController;
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], DeliveryTasksController.prototype, "findMyTasks", null);
__decorate([
    (0, common_1.Get)(':taskId'),
    __param(0, (0, common_1.Param)('taskId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], DeliveryTasksController.prototype, "findOne", null);
exports.DeliveryTasksController = DeliveryTasksController = __decorate([
    (0, common_1.Controller)('api/tasks'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard, guards_1.RolesGuard),
    (0, decorators_1.Roles)(enums_1.UserRole.DELIVERY),
    __metadata("design:paramtypes", [tasks_service_1.TasksService])
], DeliveryTasksController);
//# sourceMappingURL=tasks.controller.js.map