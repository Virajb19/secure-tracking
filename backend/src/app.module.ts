import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { TasksModule } from './tasks/tasks.module';
import { TaskEventsModule } from './task-events/task-events.module';

/**
 * Root Application Module.
 * 
 * Configures:
 * - Environment variables loading
 * - TypeORM with PostgreSQL
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

        // Configure TypeORM with PostgreSQL
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get<string>('DB_HOST', 'localhost'),
                port: configService.get<number>('DB_PORT', 5432),
                username: configService.get<string>('DB_USERNAME', 'postgres'),
                password: configService.get<string>('DB_PASSWORD'),
                database: configService.get<string>('DB_DATABASE', 'secure_tracking'),
                entities: [__dirname + '/**/*.entity{.ts,.js}'],
                // SECURITY: Never use synchronize in production
                // Use migrations instead
                synchronize: configService.get<string>('NODE_ENV') === 'development',
                logging: configService.get<string>('NODE_ENV') === 'development',
            }),
            inject: [ConfigService],
        }),

        // Feature modules
        // AuditLogsModule is global, so it's available everywhere
        AuditLogsModule,
        UsersModule,
        AuthModule,
        TasksModule,
        TaskEventsModule,
    ],
})
export class AppModule { }
