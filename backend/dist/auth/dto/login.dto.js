"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginDto = exports.LoginSchema = void 0;
const nestjs_zod_1 = require("nestjs-zod");
const zod_1 = require("zod");
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.email({ message: 'Please enter a valid email' }).trim().optional(),
    password: zod_1.z.string().min(8, { message: 'Password must be at least 8 characters long' }).max(15, { message: 'Password cannot exceed 15 characters' }),
    phone: zod_1.z.string().min(1, { message: "Phone number is required" }).regex(/^[+]?[\d\s-]{10,15}$/, { message: 'Invalid phone number format' }),
    device_id: zod_1.z.string().min(10).optional(),
}).refine((data) => {
    const hasEmailLogin = data.email && data.password;
    const hasPhoneLogin = data.phone;
    return hasEmailLogin || hasPhoneLogin;
}, { message: 'Either email+password or phone is required for login' });
class LoginDto extends (0, nestjs_zod_1.createZodDto)(exports.LoginSchema) {
}
exports.LoginDto = LoginDto;
//# sourceMappingURL=login.dto.js.map