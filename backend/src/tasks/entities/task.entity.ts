import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TaskStatus } from '../../shared/enums';

/**
 * Task entity for secure question paper delivery tracking.
 * Represents a delivery task assigned to a DELIVERY user.
 * 
 * SECURITY NOTES:
 * - Only assigned DELIVERY user can view/update events
 * - Status changes are audited
 * - COMPLETED tasks cannot be modified
 */
@Entity('tasks')
export class Task {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /**
     * Unique identifier for the sealed question paper pack.
     * Used for physical verification during delivery.
     */
    @Column({ type: 'varchar', length: 100, unique: true })
    sealed_pack_code: string;

    /**
     * Location where the pack is picked up from.
     */
    @Column({ type: 'text' })
    source_location: string;

    /**
     * Final destination for delivery.
     */
    @Column({ type: 'text' })
    destination_location: string;

    /**
     * ID of the DELIVERY user assigned to this task.
     */
    @Column({ type: 'uuid' })
    assigned_user_id: string;

    /**
     * Relationship to the assigned user.
     */
    @ManyToOne(() => User, { eager: true })
    @JoinColumn({ name: 'assigned_user_id' })
    assigned_user: User;

    /**
     * Allowed start time for the delivery.
     * Events before this time will mark task as SUSPICIOUS.
     */
    @Column({ type: 'timestamp' })
    start_time: Date;

    /**
     * Deadline for delivery completion.
     * Events after this time will mark task as SUSPICIOUS.
     */
    @Column({ type: 'timestamp' })
    end_time: Date;

    /**
     * Current status of the task.
     * Default: PENDING (set when task is created)
     */
    @Column({
        type: 'enum',
        enum: TaskStatus,
        default: TaskStatus.PENDING,
    })
    status: TaskStatus;

    /**
     * Server-generated timestamp when task was created.
     */
    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
}
