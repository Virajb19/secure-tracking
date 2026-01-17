/**
 * Event types for task delivery tracking.
 * Each event type can only occur ONCE per task.
 * PICKUP: Package collected from source
 * TRANSIT: Package in transit (checkpoint)
 * FINAL: Package delivered to destination (locks task permanently)
 */
export enum EventType {
    PICKUP = 'PICKUP',
    TRANSIT = 'TRANSIT',
    FINAL = 'FINAL',
}
