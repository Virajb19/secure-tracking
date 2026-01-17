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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTaskEventDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const enums_1 = require("../../shared/enums");
class CreateTaskEventDto {
}
exports.CreateTaskEventDto = CreateTaskEventDto;
__decorate([
    (0, class_validator_1.IsEnum)(enums_1.EventType, { message: 'Event type must be PICKUP, TRANSIT, or FINAL' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Event type is required' }),
    __metadata("design:type", String)
], CreateTaskEventDto.prototype, "event_type", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'Latitude must be a number' }),
    (0, class_validator_1.Min)(-90, { message: 'Latitude must be >= -90' }),
    (0, class_validator_1.Max)(90, { message: 'Latitude must be <= 90' }),
    __metadata("design:type", Number)
], CreateTaskEventDto.prototype, "latitude", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'Longitude must be a number' }),
    (0, class_validator_1.Min)(-180, { message: 'Longitude must be >= -180' }),
    (0, class_validator_1.Max)(180, { message: 'Longitude must be <= 180' }),
    __metadata("design:type", Number)
], CreateTaskEventDto.prototype, "longitude", void 0);
//# sourceMappingURL=create-task-event.dto.js.map