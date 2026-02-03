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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const client_1 = require("@prisma/client");
const users_service_1 = require("../users/users.service");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
const bcrypt = __importStar(require("bcrypt"));
const env_validation_1 = require("../env.validation");
let AuthService = class AuthService {
    constructor(usersService, jwtService, auditLogsService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.auditLogsService = auditLogsService;
    }
    async login(loginDto, ipAddress) {
        let user = null;
        if (loginDto.email && loginDto.password) {
            console.log('Login attempt for email:', loginDto.email);
            user = await this.usersService.findByEmail(loginDto.email);
            if (!user) {
                await this.auditLogsService.log(audit_logs_service_1.AuditAction.USER_LOGIN_FAILED, 'User', null, null, ipAddress);
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
            const isPasswordValid = env_validation_1.env.NODE_ENV === 'development'
                ? (loginDto.password === user.password)
                : await bcrypt.compare(loginDto.password, user.password);
            if (!isPasswordValid) {
                await this.auditLogsService.log(audit_logs_service_1.AuditAction.USER_LOGIN_FAILED, 'User', user.id, user.id, ipAddress);
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
            if (loginDto.phone && loginDto.phone.trim() !== '' && user.role !== client_1.UserRole.ADMIN && user.role !== client_1.UserRole.SUPER_ADMIN) {
                const normalizedInputPhone = loginDto.phone.replace(/[\s-]/g, '');
                const normalizedUserPhone = user.phone.replace(/[\s-]/g, '');
                if (normalizedInputPhone !== normalizedUserPhone) {
                    await this.auditLogsService.log(audit_logs_service_1.AuditAction.USER_LOGIN_FAILED, 'User', user.id, user.id, ipAddress);
                    throw new common_1.UnauthorizedException('Phone number does not match the registered account');
                }
            }
        }
        else if (loginDto.phone) {
            console.log('Login attempt for phone:', loginDto.phone);
            user = await this.usersService.findByPhone(loginDto.phone);
            if (!user) {
                await this.auditLogsService.log(audit_logs_service_1.AuditAction.USER_LOGIN_FAILED, 'User', null, null, ipAddress);
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
        }
        else {
            throw new common_1.BadRequestException('Either email+password or phone is required');
        }
        if (!user.is_active) {
            await this.auditLogsService.log(audit_logs_service_1.AuditAction.USER_LOGIN_FAILED, 'User', user.id, user.id, ipAddress);
            throw new common_1.UnauthorizedException('Your account is pending admin approval. Please wait for activation.');
        }
        if (user.role === client_1.UserRole.SEBA_OFFICER) {
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
                email: user.email,
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
    async register(registerDto, ipAddress) {
        const existingEmail = await this.usersService.findByEmail(registerDto.email);
        if (existingEmail) {
            throw new common_1.ConflictException('Email already registered');
        }
        const existingPhone = await this.usersService.findByPhone(registerDto.phone);
        if (existingPhone) {
            throw new common_1.ConflictException('Phone number already registered');
        }
        const hashedPassword = env_validation_1.env.NODE_ENV === 'development' ? registerDto.password : await bcrypt.hash(registerDto.password, 10);
        const user = await this.usersService.registerUser({
            name: registerDto.name,
            email: registerDto.email,
            password: hashedPassword,
            phone: registerDto.phone,
            role: registerDto.role,
            gender: registerDto.gender,
            profile_image_url: registerDto.profile_image_url,
            is_active: false,
        }, ipAddress);
        await this.auditLogsService.log(audit_logs_service_1.AuditAction.USER_REGISTERED, 'User', user.id, user.id, ipAddress);
        console.log('New user registered with ID:', user.id);
        return {
            message: 'Registration successful. Please wait for admin approval.',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
            },
        };
    }
    async adminLogin(loginDto, ipAddress) {
        if (!loginDto.email || !loginDto.password) {
            throw new common_1.BadRequestException('Email and password are required');
        }
        const user = await this.usersService.findByEmail(loginDto.email);
        if (!user) {
            await this.auditLogsService.log(audit_logs_service_1.AuditAction.USER_LOGIN_FAILED, 'User', null, null, ipAddress);
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (user.role !== client_1.UserRole.ADMIN && user.role !== client_1.UserRole.SUPER_ADMIN) {
            await this.auditLogsService.log(audit_logs_service_1.AuditAction.USER_LOGIN_FAILED, 'User', user.id, user.id, ipAddress);
            throw new common_1.ForbiddenException('Access denied. Only administrators can access this portal.');
        }
        const isPasswordValid = env_validation_1.env.NODE_ENV === 'development'
            ? (loginDto.password === user.password)
            : await bcrypt.compare(loginDto.password, user.password);
        loginDto.password === user.password;
        if (!isPasswordValid) {
            await this.auditLogsService.log(audit_logs_service_1.AuditAction.USER_LOGIN_FAILED, 'User', user.id, user.id, ipAddress);
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.is_active) {
            await this.auditLogsService.log(audit_logs_service_1.AuditAction.USER_LOGIN_FAILED, 'User', user.id, user.id, ipAddress);
            throw new common_1.UnauthorizedException('Your account is inactive. Please contact the system administrator.');
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
                email: user.email,
                phone: user.phone,
                role: user.role,
                profile_image_url: user.profile_image_url,
            },
        };
    }
    async logout(userId, ipAddress) {
        await this.auditLogsService.log(audit_logs_service_1.AuditAction.USER_LOGOUT, 'User', userId, userId, ipAddress);
        return { message: 'Logged out successfully' };
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