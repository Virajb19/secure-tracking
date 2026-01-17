import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    Min,
    Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventType } from '../../shared/enums';

/**
 * DTO for creating a task event.
 * 
 * CRITICAL: No timestamp field - server generates it.
 * Image is handled separately via multipart upload.
 */
export class CreateTaskEventDto {
    /**
     * Type of event being recorded.
     * Each type can only occur ONCE per task.
     */
    @IsEnum(EventType, { message: 'Event type must be PICKUP, TRANSIT, or FINAL' })
    @IsNotEmpty({ message: 'Event type is required' })
    event_type: EventType;

    /**
     * GPS latitude at time of event.
     * Valid range: -90 to 90
     */
    @Type(() => Number)
    @IsNumber({}, { message: 'Latitude must be a number' })
    @Min(-90, { message: 'Latitude must be >= -90' })
    @Max(90, { message: 'Latitude must be <= 90' })
    latitude: number;

    /**
     * GPS longitude at time of event.
     * Valid range: -180 to 180
     */
    @Type(() => Number)
    @IsNumber({}, { message: 'Longitude must be a number' })
    @Min(-180, { message: 'Longitude must be >= -180' })
    @Max(180, { message: 'Longitude must be <= 180' })
    longitude: number;
}
