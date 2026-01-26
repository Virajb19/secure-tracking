import { Module } from '@nestjs/common';
import { FormSubmissionsService } from './form-submissions.service';
import { FormSubmissionsController } from './form-submissions.controller';
import { PrismaModule } from '../prisma';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [PrismaModule, NotificationsModule],
    controllers: [FormSubmissionsController],
    providers: [FormSubmissionsService],
    exports: [FormSubmissionsService],
})
export class FormSubmissionsModule {}
