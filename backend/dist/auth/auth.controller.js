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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../shared/guards/jwt-auth.guard");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_1 = require("@nestjs/config");
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dto/login.dto");
const register_dto_1 = require("./dto/register.dto");
const decorators_1 = require("../shared/decorators");
const users_service_1 = require("../users/users.service");
const env_validation_1 = require("../env.validation");
const client_1 = require("@prisma/client");
const profileImageMulterOptions = {
    storage: (0, multer_1.memoryStorage)(),
    limits: {
        fileSize: 5 * 1024 * 1024,
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
let AuthController = class AuthController {
    constructor(authService, usersService, configService) {
        this.authService = authService;
        this.usersService = usersService;
        this.configService = configService;
    }
    setRefreshTokenCookie(res, refreshToken) {
        const isProduction = this.configService.get('NODE_ENV') === 'production';
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            path: '/api/auth',
            maxAge: this.parseMaxAge(),
        });
    }
    clearRefreshTokenCookie(res) {
        const isProduction = this.configService.get('NODE_ENV') === 'production';
        res.cookie('refreshToken', '', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            path: '/api/auth',
            maxAge: 0,
        });
    }
    setAccessTokenCookie(res, accessToken) {
        const isProduction = env_validation_1.env.NODE_ENV === 'production';
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            path: '/',
            maxAge: this.parseAccessTokenMaxAge(),
        });
    }
    clearAccessTokenCookie(res) {
        const isProduction = env_validation_1.env.NODE_ENV === 'production';
        res.cookie('accessToken', '', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            path: '/',
            maxAge: 0,
        });
    }
    parseMaxAge() {
        const duration = this.configService.get('REFRESH_TOKEN_EXPIRES_IN', '7d');
        const match = duration.match(/^(\d+)(s|m|h|d)$/);
        if (!match)
            return 7 * 24 * 60 * 60 * 1000;
        const value = parseInt(match[1]);
        switch (match[2]) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return 7 * 24 * 60 * 60 * 1000;
        }
    }
    parseAccessTokenMaxAge() {
        const duration = this.configService.get('JWT_EXPIRES_IN', '15m');
        const match = duration.match(/^(\d+)(s|m|h|d)$/);
        if (!match)
            return 15 * 60 * 1000;
        const value = parseInt(match[1]);
        switch (match[2]) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return 15 * 60 * 1000;
        }
    }
    async login(loginDto, request, res) {
        const ipAddress = this.extractIpAddress(request);
        const result = await this.authService.login(loginDto, ipAddress);
        this.setRefreshTokenCookie(res, result.refresh_token);
        this.setAccessTokenCookie(res, result.access_token);
        return result;
    }
    async register(registerDto, request) {
        const ipAddress = this.extractIpAddress(request);
        return this.authService.register(registerDto, ipAddress);
    }
    async adminLogin(loginDto, request, res) {
        const ipAddress = this.extractIpAddress(request);
        const result = await this.authService.adminLogin(loginDto, ipAddress);
        console.log(result);
        this.setRefreshTokenCookie(res, result.refresh_token);
        this.setAccessTokenCookie(res, result.access_token);
        return result;
    }
    async refresh(body, request, res) {
        const refreshToken = request.cookies?.refreshToken || body.refresh_token;
        if (!refreshToken) {
            throw new common_1.BadRequestException('refresh_token is required');
        }
        const result = await this.authService.refreshAccessToken(refreshToken);
        this.setRefreshTokenCookie(res, result.refresh_token);
        this.setAccessTokenCookie(res, result.access_token);
        return result;
    }
    extractIpAddress(request) {
        const forwarded = request.headers['x-forwarded-for'];
        if (forwarded) {
            const forwardedIps = Array.isArray(forwarded) ? forwarded[0] : forwarded;
            return forwardedIps.split(',')[0].trim();
        }
        return request.ip || request.socket.remoteAddress || 'unknown';
    }
    async getMe(request) {
        const user = request.user;
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            gender: user.gender,
            profile_image_url: user.profile_image_url,
            is_active: user.is_active,
        };
    }
    async logout(request, res) {
        const user = request.user;
        const ipAddress = this.extractIpAddress(request);
        this.clearRefreshTokenCookie(res);
        this.clearAccessTokenCookie(res);
        return this.authService.logout(user.userId, ipAddress);
    }
    async uploadProfileImage(image) {
        if (!image) {
            throw new common_1.BadRequestException('Image file is required');
        }
        const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const extension = path.extname(image.originalname) || '.jpg';
        const filename = `profile_${timestamp}_${randomStr}${extension}`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, image.buffer);
        const url = `/uploads/profiles/${filename}`;
        console.log('[Auth] Profile image uploaded:', url);
        return { url };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('admin/login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, decorators_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SUBJECT_COORDINATOR, client_1.UserRole.ASSISTANT),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "adminLogin", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getMe", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('upload-profile-image'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', profileImageMulterOptions)),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "uploadProfileImage", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        users_service_1.UsersService,
        config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map