import { Task } from '../../tasks/entities/task.entity';
import { EventType } from '../../shared/enums';
export declare class TaskEvent {
    id: string;
    task_id: string;
    task: Task;
    event_type: EventType;
    image_url: string;
    image_hash: string;
    latitude: number;
    longitude: number;
    server_timestamp: Date;
    created_at: Date;
}
