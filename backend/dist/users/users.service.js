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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./entities/user.entity");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
let UsersService = class UsersService {
    constructor(userRepository, auditLogsService) {
        this.userRepository = userRepository;
        this.auditLogsService = auditLogsService;
    }
    async create(createUserDto, creatorId, ipAddress) {
        const existingUser = await this.userRepository.findOne({
            where: { phone: createUserDto.phone },
        });
        if (existingUser) {
            throw new common_1.ConflictException('User with this phone number already exists');
        }
        const user = this.userRepository.create({
            name: createUserDto.name,
            phone: createUserDto.phone,
            role: createUserDto.role,
            is_active: createUserDto.is_active ?? true,
            device_id: null,
        });
        const savedUser = await this.userRepository.save(user);
        await this.auditLogsService.log(audit_logs_service_1.AuditAction.USER_CREATED, 'User', savedUser.id, creatorId, ipAddress);
        return savedUser;
    }
    async findAll() {
        return this.userRepository.find({
            order: { created_at: 'DESC' },
        });
    }
    async findById(id) {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }
    async findByPhone(phone) {
        return this.userRepository.findOne({ where: { phone } });
    }
    async bindDeviceId(userId, deviceId, ipAddress) {
        const user = await this.findById(userId);
        user.device_id = deviceId;
        const updatedUser = await this.userRepository.save(user);
        await this.auditLogsService.log(audit_logs_service_1.AuditAction.DEVICE_ID_BOUND, 'User', userId, userId, ipAddress);
        return updatedUser;
    }
    async deactivate(userId, adminId, ipAddress) {
        const user = await this.findById(userId);
        user.is_active = false;
        const updatedUser = await this.userRepository.save(user);
        await this.auditLogsService.log(audit_logs_service_1.AuditAction.USER_DEACTIVATED, 'User', userId, adminId, ipAddress);
        return updatedUser;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        audit_logs_service_1.AuditLogsService])
], UsersService);
//# sourceMappingURL=users.service.js.map