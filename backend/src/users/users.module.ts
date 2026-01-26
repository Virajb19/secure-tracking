import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

/**
 * Users Module.
 * Provides user management functionality.
 * 
 * Dependencies:
 * - PrismaModule (global) for database access
 * - AuditLogsModule (global) for audit logging
 */
@Module({
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService], // Exported for use in AuthModule
})
export class UsersModule { }
