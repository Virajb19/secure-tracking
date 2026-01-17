import { UserRole } from '../../shared/enums';
export declare class CreateUserDto {
    name: string;
    phone: string;
    role: UserRole;
    is_active?: boolean;
}
