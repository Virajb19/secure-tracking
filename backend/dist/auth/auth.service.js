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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const users_service_1 = require("../users/users.service");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
const enums_1 = require("../shared/enums");
let AuthService = class AuthService {
    constructor(usersService, jwtService, auditLogsService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.auditLogsService = auditLogsService;
    }
    async login(loginDto, ipAddress) {
        const user = await this.usersService.findByPhone(loginDto.phone);
        if (!user) {
            await this.auditLogsService.log(audit_logs_service_1.AuditAction.USER_LOGIN_FAILED, 'User', null, null, ipAddress);
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.is_active) {
            await this.auditLogsService.log(audit_logs_service_1.AuditAction.USER_LOGIN_FAILED, 'User', user.id, user.id, ipAddress);
            throw new common_1.UnauthorizedException('Account is deactivated');
        }
        if (user.role === enums_1.UserRole.DELIVERY) {
            await this.validateDeliveryUserDevice(user, loginDto.device_id, ipAddress);
        }
        const payload = {
            sub: user.id,
            phone: user.phone,
            role: user.role,
        };
        const accessToken = this.jwtService.sign(payload);
        await this.auditLogsService.log(audit_logs_service_1.AuditAction.USER_LOGIN, 'User', user.id, user.id, ipAddress);
        return {
            access_token: accessToken,
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                role: user.role,
            },
        };
    }
    async validateDeliveryUserDevice(user, deviceId, ipAddress) {
        if (!deviceId) {
            throw new common_1.BadRequestException('device_id is required for DELIVERY users');
        }
        if (!user.device_id) {
            await this.usersService.bindDeviceId(user.id, deviceId, ipAddress);
            return;
        }
        if (user.device_id !== deviceId) {
            await this.auditLogsService.log(audit_logs_service_1.AuditAction.DEVICE_ID_MISMATCH, 'User', user.id, user.id, ipAddress);
            throw new common_1.ForbiddenException('Device ID mismatch. This account is bound to a different device.');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        audit_logs_service_1.AuditLogsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map