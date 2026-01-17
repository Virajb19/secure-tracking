import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { TasksService } from './tasks.service';
import { AdminTasksController, DeliveryTasksController } from './tasks.controller';
import { UsersModule } from '../users/users.module';
import { TaskEventsModule } from '../task-events/task-events.module';

/**
 * Tasks Module.
 * Provides task management functionality for both ADMIN and DELIVERY users.
 * 
 * Dependencies:
 * - TypeORM for database access
 * - UsersModule for user validation
 * - TaskEventsModule for retrieving task events (admin endpoint)
 * - AuditLogsModule (global) for audit logging
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([Task]),
        UsersModule, // For validating assigned users
        forwardRef(() => TaskEventsModule), // For admin events endpoint
    ],
    controllers: [AdminTasksController, DeliveryTasksController],
    providers: [TasksService],
    exports: [TasksService], // Exported for use in TaskEventsModule
})
export class TasksModule { }

