import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean, Length, Matches } from 'class-validator';
import { UserRole } from '../../shared/enums';

/**
 * DTO for creating a new user.
 * Used by admin to create ADMIN or DELIVERY users.
 */
export class CreateUserDto {
    /**
     * Full name of the user.
     */
    @IsString()
    @IsNotEmpty({ message: 'Name is required' })
    @Length(2, 255, { message: 'Name must be between 2 and 255 characters' })
    name: string;

    /**
     * Phone number (unique identifier for login).
     * Must be a valid phone number format.
     */
    @IsString()
    @IsNotEmpty({ message: 'Phone is required' })
    @Matches(/^[+]?[\d\s-]{10,15}$/, {
        message: 'Phone must be a valid phone number (10-15 digits)',
    })
    phone: string;

    /**
     * User role - ADMIN or DELIVERY.
     */
    @IsEnum(UserRole, { message: 'Role must be either ADMIN or DELIVERY' })
    @IsNotEmpty({ message: 'Role is required' })
    role: UserRole;

    /**
     * Whether the user is active.
     * Defaults to true if not provided.
     */
    @IsOptional()
    @IsBoolean({ message: 'is_active must be a boolean' })
    is_active?: boolean;
}
