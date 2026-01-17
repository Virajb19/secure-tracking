import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

/**
 * Audit Log entity for tracking all sensitive actions.
 * This is a write-only table - records should NEVER be updated or deleted.
 * 
 * IMMUTABILITY RULE:
 * - No UPDATE operations on this table
 * - No DELETE operations on this table
 * - All entries are permanent evidence
 */
@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /**
     * User who performed the action.
     * Can be null for system-generated events.
     */
    @Column({ type: 'uuid', nullable: true })
    user_id: string | null;

    /**
     * Description of the action performed.
     * Examples: 'USER_LOGIN', 'TASK_CREATED', 'EVENT_UPLOADED'
     */
    @Column({ type: 'text' })
    action: string;

    /**
     * Type of entity affected.
     * Examples: 'User', 'Task', 'TaskEvent'
     */
    @Column({ type: 'varchar', length: 100 })
    entity_type: string;

    /**
     * ID of the entity affected.
     */
    @Column({ type: 'uuid', nullable: true })
    entity_id: string | null;

    /**
     * IP address of the request origin.
     */
    @Column({ type: 'varchar', length: 45, nullable: true })
    ip_address: string | null;

    /**
     * Server-generated timestamp.
     * NEVER use client-provided timestamps.
     */
    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
}
