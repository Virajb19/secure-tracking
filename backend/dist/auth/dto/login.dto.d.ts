import { z } from 'zod';
export declare const CLASS_GROUPS: readonly ["8-10", "11-12"];
export type ClassGroup = typeof CLASS_GROUPS[number];
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodEmail>;
    password: z.ZodString;
    phone: z.ZodString;
    device_id: z.ZodOptional<z.ZodString>;
    subject: z.ZodOptional<z.ZodString>;
    classGroup: z.ZodOptional<z.ZodEnum<{
        "8-10": "8-10";
        "11-12": "11-12";
    }>>;
}, z.core.$strip>;
declare const LoginDto_base: import("nestjs-zod").ZodDto<z.ZodObject<{
    email: z.ZodOptional<z.ZodEmail>;
    password: z.ZodString;
    phone: z.ZodString;
    device_id: z.ZodOptional<z.ZodString>;
    subject: z.ZodOptional<z.ZodString>;
    classGroup: z.ZodOptional<z.ZodEnum<{
        "8-10": "8-10";
        "11-12": "11-12";
    }>>;
}, z.core.$strip>, false>;
export declare class LoginDto extends LoginDto_base {
}
export {};
