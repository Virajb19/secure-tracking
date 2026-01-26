import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CircularsController } from './circulars.controller';
import { CircularsService } from './circulars.service';
import { PrismaModule } from '../prisma';

@Module({
    imports: [
        PrismaModule,
        MulterModule.register({
            storage: memoryStorage(),
            limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
        }),
    ],
    controllers: [CircularsController],
    providers: [CircularsService],
    exports: [CircularsService],
})
export class CircularsModule {}
