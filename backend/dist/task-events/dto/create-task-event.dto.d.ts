import { z } from 'zod';
export declare const CreateTaskEventSchema: z.ZodObject<{
    event_type: z.ZodEnum<{
        PICKUP_POLICE_STATION: "PICKUP_POLICE_STATION";
        ARRIVAL_EXAM_CENTER: "ARRIVAL_EXAM_CENTER";
        OPENING_SEAL: "OPENING_SEAL";
        SEALING_ANSWER_SHEETS: "SEALING_ANSWER_SHEETS";
        SUBMISSION_POST_OFFICE: "SUBMISSION_POST_OFFICE";
    }>;
    latitude: z.ZodCoercedNumber<unknown>;
    longitude: z.ZodCoercedNumber<unknown>;
}, z.core.$strip>;
export type CreateTaskEventInput = z.infer<typeof CreateTaskEventSchema>;
declare const CreateTaskEventDto_base: import("nestjs-zod").ZodDto<z.ZodObject<{
    event_type: z.ZodEnum<{
        PICKUP_POLICE_STATION: "PICKUP_POLICE_STATION";
        ARRIVAL_EXAM_CENTER: "ARRIVAL_EXAM_CENTER";
        OPENING_SEAL: "OPENING_SEAL";
        SEALING_ANSWER_SHEETS: "SEALING_ANSWER_SHEETS";
        SUBMISSION_POST_OFFICE: "SUBMISSION_POST_OFFICE";
    }>;
    latitude: z.ZodCoercedNumber<unknown>;
    longitude: z.ZodCoercedNumber<unknown>;
}, z.core.$strip>, false>;
export declare class CreateTaskEventDto extends CreateTaskEventDto_base {
}
export {};
