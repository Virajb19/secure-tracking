import { User } from '../../users/entities/user.entity';
import { TaskStatus } from '../../shared/enums';
export declare class Task {
    id: string;
    sealed_pack_code: string;
    source_location: string;
    destination_location: string;
    assigned_user_id: string;
    assigned_user: User;
    start_time: Date;
    end_time: Date;
    status: TaskStatus;
    created_at: Date;
}
