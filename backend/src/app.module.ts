import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma';
import { AppwriteModule } from './appwrite';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { TasksModule } from './tasks/tasks.module';
import { TaskEventsModule } from './task-events/task-events.module';
import { MasterDataModule } from './master-data/master-data.module';
import { FacultyModule } from './faculty/faculty.module';
import { Form6Module } from './form-6/form-6.module';
import { EventsModule } from './events/events.module';
import { NoticesModule } from './notices/notices.module';
import { CircularsModule } from './circulars/circulars.module';
import { HelpdeskModule } from './helpdesk/helpdesk.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaperSetterModule } from './paper-setter/paper-setter.module';
import { BankDetailsModule } from './bank-details/bank-details.module';
import { UserStarsModule } from './user-stars/user-stars.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { FormSubmissionsModule } from './form-submissions/form-submissions.module';

/**
 * Root Application Module.
 * 
 * Configures:
 * - Environment variables loading
 * - Prisma ORM with PostgreSQL
 * - Appwrite storage integration
 * - All feature modules
 * 
 * IMPORTANT: AuditLogsModule is imported first (global module)
 * to ensure it's available for all other modules.
 */
@Module({
    imports: [
        // Load environment variables
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),

        // Prisma ORM Module (global)
        PrismaModule,

        // Appwrite Storage (global)
        AppwriteModule,

        // Feature modules
        // AuditLogsModule is global, so it's available everywhere
        AuditLogsModule,
        NotificationsModule,
        UsersModule,
        AuthModule,
        TasksModule,
        TaskEventsModule,
        MasterDataModule,
        FacultyModule,
        Form6Module,
        EventsModule,
        NoticesModule,
        CircularsModule,
        HelpdeskModule,
        
        // New Feature Modules
        PaperSetterModule,
        BankDetailsModule,
        UserStarsModule,
        AnalyticsModule,
        FormSubmissionsModule,
    ],
})
export class AppModule { }
