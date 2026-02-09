import { Module, forwardRef } from '@nestjs/common';
import { TaskEventsService } from './task-events.service';
import { TaskEventsController } from './task-events.controller';
import { TasksModule } from '../tasks/tasks.module';
import { AppwriteModule } from '../appwrite/appwrite.module';

/**
 * Task Events Module.
 * Handles immutable event recording for delivery tracking.
 * 
 * Dependencies:
 * - PrismaModule (global) for database access
 * - TasksModule for task validation and status updates
 * - AuditLogsModule (global) for audit logging
 * - AppwriteModule for cloud image storage
 * 
 * SECURITY NOTE:
 * This module only provides CREATE and READ operations.
 * UPDATE and DELETE are intentionally NOT implemented.
 */
@Module({
    imports: [
        forwardRef(() => TasksModule), // For task validation and status updates
        AppwriteModule, // For cloud image storage
    ],
    controllers: [TaskEventsController],
    providers: [TaskEventsService],
    exports: [TaskEventsService],
})
export class TaskEventsModule { }
