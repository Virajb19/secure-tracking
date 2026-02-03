import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

/**
 * Attendance Module.
 * 
 * Provides geo-fenced attendance functionality for NBSE officers.
 * 
 * DEPENDENCIES:
 * - PrismaModule: Database access
 * - AuditLogsModule: Audit trail logging
 * - MulterModule: File upload handling
 */
@Module({
    imports: [
        PrismaModule,
        AuditLogsModule,
        MulterModule.register({
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB
            },
        }),
    ],
    controllers: [AttendanceController],
    providers: [AttendanceService],
    exports: [AttendanceService],
})
export class AttendanceModule { }
