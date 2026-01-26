import { z } from 'zod';
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    device_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const LoginDto_base: import("nestjs-zod").ZodDto<z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    device_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, false>;
export declare class LoginDto extends LoginDto_base {
}
export {};
