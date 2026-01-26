import { IsString, IsOptional, IsEnum, MinLength, MaxLength, Matches } from 'class-validator';
import { Gender } from '@prisma/client';

/**
 * DTO for updating personal details.
 * Only allows updating: name, phone, gender
 */
export class UpdatePersonalDetailsDto {
    @IsString()
    @IsOptional()
    @MinLength(2, { message: 'Name must be at least 2 characters' })
    @MaxLength(255, { message: 'Name must not exceed 255 characters' })
    name?: string;

    @IsString()
    @IsOptional()
    @Matches(/^[0-9]{10}$/, { message: 'Phone must be a valid 10-digit number' })
    phone?: string;

    @IsEnum(Gender)
    @IsOptional()
    gender?: Gender;
}
