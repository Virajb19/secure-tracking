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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const client_1 = require("@prisma/client");
const users_service_1 = require("./users.service");
const create_user_dto_1 = require("./dto/create-user.dto");
const toggle_user_status_dto_1 = require("./dto/toggle-user-status.dto");
const guards_1 = require("../shared/guards");
const decorators_1 = require("../shared/decorators");
const appwrite_service_1 = require("../appwrite/appwrite.service");
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
let UsersController = class UsersController {
    constructor(usersService, appwriteService) {
        this.usersService = usersService;
        this.appwriteService = appwriteService;
    }
    async create(createUserDto, currentUser, request) {
        const ipAddress = this.extractIpAddress(request);
        return this.usersService.create(createUserDto, currentUser.id, ipAddress);
    }
    async findAll(page, limit, role, district_id, school_id, class_level, subject, search, is_active, approval_status) {
        return this.usersService.findAllPaginated({
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 25,
            role,
            district_id,
            school_id,
            class_level: class_level ? parseInt(class_level, 10) : undefined,
            subject,
            search,
            is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
            approval_status,
        });
    }
    async toggleStatus(userId, toggleStatusDto, currentUser, request) {
        const ipAddress = this.extractIpAddress(request);
        return this.usersService.toggleActiveStatus(userId, toggleStatusDto.is_active, currentUser.id, ipAddress);
    }
    async uploadProfilePhoto(file, currentUser, request) {
        if (!file) {
            throw new common_1.BadRequestException('No file provided');
        }
        if (file.size > MAX_FILE_SIZE) {
            throw new common_1.BadRequestException(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
        }
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new common_1.BadRequestException(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
        }
        if (currentUser.profile_image_url) {
            try {
                await this.appwriteService.deleteFile(currentUser.profile_image_url);
            }
            catch (e) {
                console.error('Failed to delete old profile photo:', e);
            }
        }
        const photoUrl = await this.appwriteService.uploadFile(file.buffer, file.originalname, file.mimetype);
        if (!photoUrl) {
            throw new common_1.BadRequestException('Failed to upload file to storage');
        }
        const ipAddress = this.extractIpAddress(request);
        const user = await this.usersService.updateProfilePhoto(currentUser.id, photoUrl, ipAddress);
        return { user, photoUrl };
    }
    async updateProfilePhoto(body, currentUser, request) {
        const ipAddress = this.extractIpAddress(request);
        return this.usersService.updateProfilePhoto(currentUser.id, body.profile_image_url, ipAddress);
    }
    async resetDevice(userId, currentUser, request) {
        const ipAddress = this.extractIpAddress(request);
        return this.usersService.resetDeviceId(userId, currentUser.id, ipAddress);
    }
    async getTeachingAssignments(userId) {
        return this.usersService.getTeachingAssignments(userId);
    }
    async approveUser(userId, body, currentUser, request) {
        const ipAddress = this.extractIpAddress(request);
        return this.usersService.updateApprovalStatus(userId, body.status, currentUser.id, ipAddress, body.rejection_reason);
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
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, decorators_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('role')),
    __param(3, (0, common_1.Query)('district_id')),
    __param(4, (0, common_1.Query)('school_id')),
    __param(5, (0, common_1.Query)('class_level')),
    __param(6, (0, common_1.Query)('subject')),
    __param(7, (0, common_1.Query)('search')),
    __param(8, (0, common_1.Query)('is_active')),
    __param(9, (0, common_1.Query)('approval_status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)(':userId/status'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, decorators_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, toggle_user_status_dto_1.ToggleUserStatusDto, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "toggleStatus", null);
__decorate([
    (0, common_1.Post)('me/profile-photo/upload'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, decorators_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "uploadProfilePhoto", null);
__decorate([
    (0, common_1.Patch)('me/profile-photo'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, decorators_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateProfilePhoto", null);
__decorate([
    (0, common_1.Patch)(':userId/reset-device'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, decorators_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "resetDevice", null);
__decorate([
    (0, common_1.Get)(':userId/teaching-assignments'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getTeachingAssignments", null);
__decorate([
    (0, common_1.Patch)(':userId/approve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, decorators_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "approveUser", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('admin/users'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard, guards_1.RolesGuard),
    (0, decorators_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        appwrite_service_1.AppwriteService])
], UsersController);
//# sourceMappingURL=users.controller.js.map