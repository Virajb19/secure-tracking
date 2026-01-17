import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    OneToMany,
} from 'typeorm';
import { UserRole } from '../../shared/enums';

/**
 * User entity for the secure tracking system.
 * Represents both ADMIN (CMS users) and DELIVERY (mobile app users).
 * 
 * SECURITY NOTE:
 * - device_id is bound on first login for DELIVERY users
 * - phone must be unique across all users
 */
@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 50, unique: true })
    phone: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.DELIVERY,
    })
    role: UserRole;

    /**
     * Device ID for DELIVERY users.
     * Bound on first login and cannot be changed.
     * Null for ADMIN users.
     */
    @Column({ type: 'varchar', length: 255, nullable: true })
    device_id: string | null;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
}
