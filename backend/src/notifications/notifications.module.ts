import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { AdminNotificationsController } from './admin-notifications.controller';

/**
 * NotificationsModule
 * 
 * Global module for push notifications.
 * Provides NotificationsService to all other modules.
 */
@Global()
@Module({
    controllers: [NotificationsController, AdminNotificationsController],
    providers: [NotificationsService],
    exports: [NotificationsService],
})
export class NotificationsModule {}
