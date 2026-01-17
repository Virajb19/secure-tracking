import {
    IsString,
    IsNotEmpty,
    IsUUID,
    IsDateString,
    Length,
} from 'class-validator';

/**
 * DTO for creating a new delivery task.
 * Used by admin to assign tasks to DELIVERY users.
 * 
 * NOTE: status is NOT included - defaults to PENDING
 * NOTE: created_at is server-generated
 */
export class CreateTaskDto {
    /**
     * Unique sealed pack identifier.
     * Used for physical verification during delivery.
     */
    @IsString()
    @IsNotEmpty({ message: 'Sealed pack code is required' })
    @Length(3, 100, { message: 'Sealed pack code must be between 3 and 100 characters' })
    sealed_pack_code: string;

    /**
     * Pickup location for the delivery.
     */
    @IsString()
    @IsNotEmpty({ message: 'Source location is required' })
    source_location: string;

    /**
     * Final delivery destination.
     */
    @IsString()
    @IsNotEmpty({ message: 'Destination location is required' })
    destination_location: string;

    /**
     * UUID of the DELIVERY user to assign this task to.
     */
    @IsUUID('4', { message: 'Assigned user ID must be a valid UUID' })
    @IsNotEmpty({ message: 'Assigned user ID is required' })
    assigned_user_id: string;

    /**
     * Start of allowed delivery window (ISO 8601 format).
     */
    @IsDateString({}, { message: 'Start time must be a valid ISO 8601 date string' })
    @IsNotEmpty({ message: 'Start time is required' })
    start_time: string;

    /**
     * End of allowed delivery window (ISO 8601 format).
     */
    @IsDateString({}, { message: 'End time must be a valid ISO 8601 date string' })
    @IsNotEmpty({ message: 'End time is required' })
    end_time: string;
}
