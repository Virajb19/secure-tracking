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
exports.CreateTaskDto = void 0;
const class_validator_1 = require("class-validator");
class CreateTaskDto {
}
exports.CreateTaskDto = CreateTaskDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Sealed pack code is required' }),
    (0, class_validator_1.Length)(3, 100, { message: 'Sealed pack code must be between 3 and 100 characters' }),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "sealed_pack_code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Source location is required' }),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "source_location", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Destination location is required' }),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "destination_location", void 0);
__decorate([
    (0, class_validator_1.IsUUID)('4', { message: 'Assigned user ID must be a valid UUID' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Assigned user ID is required' }),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "assigned_user_id", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Start time must be a valid ISO 8601 date string' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Start time is required' }),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "start_time", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'End time must be a valid ISO 8601 date string' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'End time is required' }),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "end_time", void 0);
//# sourceMappingURL=create-task.dto.js.map