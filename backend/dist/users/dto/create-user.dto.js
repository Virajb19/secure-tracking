"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUserDto = exports.CreateUserSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const nestjs_zod_1 = require("nestjs-zod");
exports.CreateUserSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(255, 'Name must be at most 255 characters'),
    phone: zod_1.z
        .string()
        .regex(/^[+]?[\d\s-]{10,15}$/, 'Phone must be a valid phone number (10–15 digits)'),
    password: zod_1.z
        .string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password must be at most 100 characters'),
    role: zod_1.z.enum(client_1.UserRole, {
        message: 'Role must be either ADMIN or DELIVERY',
    }),
    is_active: zod_1.z.boolean().optional().default(true),
});
class CreateUserDto extends (0, nestjs_zod_1.createZodDto)(exports.CreateUserSchema) {
}
exports.CreateUserDto = CreateUserDto;
//# sourceMappingURL=create-user.dto.js.map