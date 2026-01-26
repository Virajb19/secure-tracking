"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTaskEventDto = exports.CreateTaskEventSchema = void 0;
const nestjs_zod_1 = require("nestjs-zod");
const zod_1 = require("zod");
exports.CreateTaskEventSchema = zod_1.z.object({
    event_type: zod_1.z.enum(['PICKUP_POLICE_STATION', 'ARRIVAL_EXAM_CENTER', 'OPENING_SEAL', 'SEALING_ANSWER_SHEETS', 'SUBMISSION_POST_OFFICE'], {
        message: 'Event type must be one of: PICKUP_POLICE_STATION, ARRIVAL_EXAM_CENTER, OPENING_SEAL, SEALING_ANSWER_SHEETS, SUBMISSION_POST_OFFICE',
    }),
    latitude: zod_1.z.coerce
        .number()
        .min(-90, 'Latitude must be >= -90')
        .max(90, 'Latitude must be <= 90'),
    longitude: zod_1.z.coerce
        .number()
        .min(-180, 'Longitude must be >= -180')
        .max(180, 'Longitude must be <= 180'),
});
class CreateTaskEventDto extends (0, nestjs_zod_1.createZodDto)(exports.CreateTaskEventSchema) {
}
exports.CreateTaskEventDto = CreateTaskEventDto;
//# sourceMappingURL=create-task-event.dto.js.map