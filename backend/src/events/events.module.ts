import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PrismaModule } from '../prisma';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EventsController, AdminEventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
    imports: [
        PrismaModule,
        AuditLogsModule,
        MulterModule.register({
            storage: memoryStorage(),
            limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for flyers
        }),
    ],
    controllers: [EventsController, AdminEventsController],
    providers: [EventsService],
    exports: [EventsService],
})
export class EventsModule {}
