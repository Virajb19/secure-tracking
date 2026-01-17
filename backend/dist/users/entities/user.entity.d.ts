import { UserRole } from '../../shared/enums';
export declare class User {
    id: string;
    name: string;
    phone: string;
    role: UserRole;
    device_id: string | null;
    is_active: boolean;
    created_at: Date;
}
