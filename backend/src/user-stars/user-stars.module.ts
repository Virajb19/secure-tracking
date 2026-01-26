import { Module } from '@nestjs/common';
import { UserStarsController } from './user-stars.controller';
import { UserStarsService } from './user-stars.service';
import { PrismaModule } from '../prisma';

@Module({
    imports: [PrismaModule],
    controllers: [UserStarsController],
    providers: [UserStarsService],
    exports: [UserStarsService],
})
export class UserStarsModule {}
