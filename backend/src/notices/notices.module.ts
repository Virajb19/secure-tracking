import { Module } from '@nestjs/common';
import { NoticesController } from './notices.controller';
import { NoticesService } from './notices.service';
import { AdminNoticesController } from './admin-notices.controller';
import { AdminNoticesService } from './admin-notices.service';
import { PrismaModule } from '../prisma';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [PrismaModule, NotificationsModule],
    controllers: [NoticesController, AdminNoticesController],
    providers: [NoticesService, AdminNoticesService],
    exports: [NoticesService, AdminNoticesService],
})
export class NoticesModule {}
