import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class CreateHelpdeskDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    @MinLength(10)
    message: string;
}
