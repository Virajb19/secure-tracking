"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTaskDto = exports.CreateTaskSchema = void 0;
const zod_1 = require("zod");
const nestjs_zod_1 = require("nestjs-zod");
exports.CreateTaskSchema = zod_1.z.object({
    sealed_pack_code: zod_1.z
        .string()
        .min(3, 'Sealed pack code must be at least 3 characters')
        .max(100, 'Sealed pack code must be at most 100 characters'),
    source_location: zod_1.z
        .string()
        .min(1, 'Source location is required'),
    destination_location: zod_1.z
        .string()
        .min(1, 'Destination location is required'),
    assigned_user_id: zod_1.z.uuid({
        message: 'Assigned user ID must be a valid UUID',
    }),
    start_time: zod_1.z.iso.datetime({
        message: 'Start time must be a valid ISO 8601 date string',
    }),
    end_time: zod_1.z.iso.datetime({
        message: 'End time must be a valid ISO 8601 date string',
    }),
    exam_type: zod_1.z
        .enum(['REGULAR', 'COMPARTMENTAL'])
        .optional()
        .default('REGULAR'),
    pickup_latitude: zod_1.z.coerce.number().min(-90).max(90).optional(),
    pickup_longitude: zod_1.z.coerce.number().min(-180).max(180).optional(),
    destination_latitude: zod_1.z.coerce.number().min(-90).max(90).optional(),
    destination_longitude: zod_1.z.coerce.number().min(-180).max(180).optional(),
    geofence_radius: zod_1.z.coerce.number().min(10).max(1000).optional().default(100),
})
    .refine((data) => new Date(data.end_time) > new Date(data.start_time), {
    message: 'End time must be after start time',
    path: ['end_time'],
});
class CreateTaskDto extends (0, nestjs_zod_1.createZodDto)(exports.CreateTaskSchema) {
}
exports.CreateTaskDto = CreateTaskDto;
//# sourceMappingURL=create-task.dto.js.map