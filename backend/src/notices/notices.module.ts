import { Module } from '@nestjs/common';
import { NoticesController } from './notices.controller';
import { NoticesService } from './notices.service';
import { PrismaModule } from '../prisma';

@Module({
    imports: [PrismaModule],
    controllers: [NoticesController],
    providers: [NoticesService],
    exports: [NoticesService],
})
export class NoticesModule {}
