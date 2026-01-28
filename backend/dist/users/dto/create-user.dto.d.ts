import { z } from 'zod';
export declare const CreateUserSchema: z.ZodObject<{
    name: z.ZodString;
    phone: z.ZodString;
    password: z.ZodString;
    role: z.ZodEnum<{
        SUPER_ADMIN: "SUPER_ADMIN";
        ADMIN: "ADMIN";
        SEBA_OFFICER: "SEBA_OFFICER";
        HEADMASTER: "HEADMASTER";
        TEACHER: "TEACHER";
        CENTER_SUPERINTENDENT: "CENTER_SUPERINTENDENT";
    }>;
    is_active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
declare const CreateUserDto_base: import("nestjs-zod").ZodDto<z.ZodObject<{
    name: z.ZodString;
    phone: z.ZodString;
    password: z.ZodString;
    role: z.ZodEnum<{
        SUPER_ADMIN: "SUPER_ADMIN";
        ADMIN: "ADMIN";
        SEBA_OFFICER: "SEBA_OFFICER";
        HEADMASTER: "HEADMASTER";
        TEACHER: "TEACHER";
        CENTER_SUPERINTENDENT: "CENTER_SUPERINTENDENT";
    }>;
    is_active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>, false>;
export declare class CreateUserDto extends CreateUserDto_base {
}
export {};
