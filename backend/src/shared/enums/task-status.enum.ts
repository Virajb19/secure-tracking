/**
 * Task status enum for delivery tracking.
 * PENDING: Task created but not started
 * IN_PROGRESS: Delivery has begun (PICKUP event received)
 * COMPLETED: Delivery finished successfully (FINAL event received)
 * SUSPICIOUS: Delivery flagged due to time window violation
 */
export enum TaskStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    SUSPICIOUS = 'SUSPICIOUS',
}
