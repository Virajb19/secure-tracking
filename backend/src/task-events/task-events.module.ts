import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEvent } from './entities/task-event.entity';
import { TaskEventsService } from './task-events.service';
import { TaskEventsController } from './task-events.controller';
import { TasksModule } from '../tasks/tasks.module';

/**
 * Task Events Module.
 * Handles immutable event recording for delivery tracking.
 * 
 * Dependencies:
 * - TypeORM for database access
 * - TasksModule for task validation and status updates
 * - AuditLogsModule (global) for audit logging
 * 
 * SECURITY NOTE:
 * This module only provides CREATE and READ operations.
 * UPDATE and DELETE are intentionally NOT implemented.
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([TaskEvent]),
        forwardRef(() => TasksModule), // For task validation and status updates
    ],
    controllers: [TaskEventsController],
    providers: [TaskEventsService],
    exports: [TaskEventsService],
})
export class TaskEventsModule { }

