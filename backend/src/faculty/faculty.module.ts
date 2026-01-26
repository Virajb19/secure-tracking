import { Module } from '@nestjs/common';
import { FacultyController } from './faculty.controller';
import { FacultyService } from './faculty.service';
import { PrismaModule } from '../prisma';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [PrismaModule, AuditLogsModule, UsersModule],
    controllers: [FacultyController],
    providers: [FacultyService],
    exports: [FacultyService],
})
export class FacultyModule {}
