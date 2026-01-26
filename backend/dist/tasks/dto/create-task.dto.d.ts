import { z } from 'zod';
export declare const CreateTaskSchema: z.ZodObject<{
    sealed_pack_code: z.ZodString;
    source_location: z.ZodString;
    destination_location: z.ZodString;
    assigned_user_id: z.ZodUUID;
    start_time: z.ZodISODateTime;
    end_time: z.ZodISODateTime;
}, z.core.$strip>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
declare const CreateTaskDto_base: import("nestjs-zod").ZodDto<z.ZodObject<{
    sealed_pack_code: z.ZodString;
    source_location: z.ZodString;
    destination_location: z.ZodString;
    assigned_user_id: z.ZodUUID;
    start_time: z.ZodISODateTime;
    end_time: z.ZodISODateTime;
}, z.core.$strip>, false>;
export declare class CreateTaskDto extends CreateTaskDto_base {
}
export {};
