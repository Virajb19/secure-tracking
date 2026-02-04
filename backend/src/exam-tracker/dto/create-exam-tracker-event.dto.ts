import {
  IsEnum,
  IsUUID,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Enum for Exam Tracker Event Types
 * Must match Prisma ExamTrackerEventType enum
 */
export enum ExamTrackerEventType {
  TREASURY_ARRIVAL = 'TREASURY_ARRIVAL',
  CUSTODIAN_HANDOVER = 'CUSTODIAN_HANDOVER',
  OPENING_MORNING = 'OPENING_MORNING',
  PACKING_MORNING = 'PACKING_MORNING',
  DELIVERY_MORNING = 'DELIVERY_MORNING',
  OPENING_AFTERNOON = 'OPENING_AFTERNOON',
  PACKING_AFTERNOON = 'PACKING_AFTERNOON',
  DELIVERY_AFTERNOON = 'DELIVERY_AFTERNOON',
}

/**
 * DTO for creating an exam tracker event.
 * Used by Center Superintendents to record question paper events.
 */
export class CreateExamTrackerEventDto {
  @IsEnum(ExamTrackerEventType)
  event_type: ExamTrackerEventType;

  @IsDateString()
  exam_date: string; // ISO date string YYYY-MM-DD

  @IsOptional()
  @IsString()
  shift?: string; // MORNING, AFTERNOON, or GENERAL

  @IsNumber()
  @Min(-90)
  @Max(90)
  @Transform(({ value }) => parseFloat(value))
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Transform(({ value }) => parseFloat(value))
  longitude: number;

  @IsOptional()
  @IsDateString()
  captured_at?: string; // When the photo was captured
}
