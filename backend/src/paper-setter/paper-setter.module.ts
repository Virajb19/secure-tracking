import { Module } from '@nestjs/common';
import { PaperSetterController } from './paper-setter.controller';
import { PaperSetterService } from './paper-setter.service';
import { PrismaModule } from '../prisma';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [PrismaModule, NotificationsModule],
    controllers: [PaperSetterController],
    providers: [PaperSetterService],
    exports: [PaperSetterService],
})
export class PaperSetterModule {}
