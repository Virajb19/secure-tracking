import { IsString, IsNotEmpty, IsOptional, Matches, Length } from 'class-validator';

/**
 * DTO for user login.
 * 
 * SECURITY RULES:
 * - phone is the unique identifier for authentication
 * - device_id is REQUIRED for DELIVERY users
 * - device_id is bound on first login and cannot change
 */
export class LoginDto {
    /**
     * Phone number (unique identifier).
     * Must match the format used during user creation.
     */
    @IsString()
    @IsNotEmpty({ message: 'Phone is required' })
    @Matches(/^[+]?[\d\s-]{10,15}$/, {
        message: 'Phone must be a valid phone number',
    })
    phone: string;

    /**
     * Device ID for DELIVERY users.
     * Required for mobile app users.
     * Will be bound on first login and verified on subsequent logins.
     * 
     * For ADMIN users, this field is optional and ignored.
     */
    @IsOptional()
    @IsString()
    @Length(10, 255, { message: 'Device ID must be between 10 and 255 characters' })
    device_id?: string;
}
