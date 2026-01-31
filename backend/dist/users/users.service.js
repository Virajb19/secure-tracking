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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_1 = require("../prisma");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
const notifications_service_1 = require("../notifications/notifications.service");
const bcrypt = __importStar(require("bcrypt"));
let UsersService = class UsersService {
    constructor(db, auditLogsService, notificationsService) {
        this.db = db;
        this.auditLogsService = auditLogsService;
        this.notificationsService = notificationsService;
    }
    async create(createUserDto, creatorId, ipAddress) {
        const existingUser = await this.db.user.findUnique({
            where: { phone: createUserDto.phone },
        });
        if (existingUser) {
            throw new common_1.ConflictException('User with this phone number already exists');
        }
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        const savedUser = await this.db.user.create({
            data: {
                name: createUserDto.name,
                phone: createUserDto.phone,
                password: hashedPassword,
                role: createUserDto.role,
                is_active: createUserDto.is_active ?? true,
                device_id: null,
            },
        });
        await this.auditLogsService.log(audit_logs_service_1.AuditAction.USER_CREATED, 'User', savedUser.id, creatorId, ipAddress);
        return savedUser;
    }
    async findAll() {
        return this.db.user.findMany({
            include: {
                faculty: {
                    include: {
                        school: {
                            include: {
                                district: true,
                            },
                        },
                        teaching_assignments: true,
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });
    }
    async findAllPaginated(params) {
        const { page, limit, role, district_id, school_id, class_level, subject, search, is_active } = params;
        const where = {
            role: {
                notIn: [client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN],
            },
        };
        if (role) {
            where.role = role;
        }
        if (is_active !== undefined) {
            where.is_active = is_active;
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (district_id) {
            where.faculty = {
                ...where.faculty,
                school: {
                    district_id,
                },
            };
        }
        if (school_id) {
            where.faculty = {
                ...where.faculty,
                school_id,
            };
        }
        if (class_level) {
            where.faculty = {
                ...where.faculty,
                teaching_assignments: {
                    some: {
                        class_level,
                    },
                },
            };
        }
        if (subject) {
            where.faculty = {
                ...where.faculty,
                teaching_assignments: {
                    some: {
                        subject: { equals: subject, mode: 'insensitive' },
                    },
                },
            };
        }
        const total = await this.db.user.count({ where });
        const skip = (page - 1) * limit;
        const data = await this.db.user.findMany({
            where,
            include: {
                faculty: {
                    include: {
                        school: {
                            include: {
                                district: true,
                            },
                        },
                        teaching_assignments: true,
                    },
                },
            },
            orderBy: [
                { is_active: 'desc' },
                { created_at: 'desc' },
            ],
            skip,
            take: limit,
        });
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findById(id) {
        const user = await this.db.user.findUnique({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }
    async getTeachingAssignments(userId) {
        const faculty = await this.db.faculty.findFirst({
            where: { user_id: userId },
            include: { teaching_assignments: true },
        });
        if (!faculty) {
            return [];
        }
        return faculty.teaching_assignments.map((ta) => ({
            class_level: ta.class_level,
            subject: ta.subject,
        }));
    }
    async findByPhone(phone) {
        return this.db.user.findUnique({ where: { phone } });
    }
    async findByEmail(email) {
        return this.db.user.findUnique({ where: { email } });
    }
    async registerUser(data, ipAddress) {
        const user = await this.db.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: data.password,
                phone: data.phone,
                role: data.role,
                gender: data.gender,
                profile_image_url: data.profile_image_url,
                is_active: data.is_active,
                device_id: null,
            },
        });
        return user;
    }
    async bindDeviceId(userId, deviceId, ipAddress) {
        const updatedUser = await this.db.user.update({
            where: { id: userId },
            data: { device_id: deviceId },
        });
        await this.auditLogsService.log(audit_logs_service_1.AuditAction.DEVICE_ID_BOUND, 'User', userId, userId, ipAddress);
        return updatedUser;
    }
    async deactivate(userId, adminId, ipAddress) {
        const updatedUser = await this.db.user.update({
            where: { id: userId },
            data: { is_active: false },
        });
        await this.auditLogsService.log(audit_logs_service_1.AuditAction.USER_DEACTIVATED, 'User', userId, adminId, ipAddress);
        return updatedUser;
    }
    async toggleActiveStatus(userId, isActive, adminId, ipAddress) {
        const user = await this.findById(userId);
        const updatedUser = await this.db.user.update({
            where: { id: userId },
            data: { is_active: isActive },
        });
        await this.auditLogsService.log(isActive ? audit_logs_service_1.AuditAction.USER_ACTIVATED : audit_logs_service_1.AuditAction.USER_DEACTIVATED, 'User', userId, adminId, ipAddress);
        if (isActive) {
            await this.notificationsService.notifyAccountActivated(userId);
        }
        else {
            await this.notificationsService.notifyAccountDeactivated(userId);
        }
        return updatedUser;
    }
    async updatePersonalDetails(userId, data, ipAddress) {
        if (data.phone) {
            const existingUser = await this.db.user.findUnique({
                where: { phone: data.phone },
            });
            if (existingUser && existingUser.id !== userId) {
                throw new common_1.ConflictException('Phone number already in use');
            }
        }
        const updatedUser = await this.db.user.update({
            where: { id: userId },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.phone && { phone: data.phone }),
                ...(data.gender && { gender: data.gender }),
            },
        });
        await this.auditLogsService.log(audit_logs_service_1.AuditAction.USER_UPDATED, 'User', userId, userId, ipAddress);
        return updatedUser;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        audit_logs_service_1.AuditLogsService,
        notifications_service_1.NotificationsService])
], UsersService);
//# sourceMappingURL=users.service.js.map