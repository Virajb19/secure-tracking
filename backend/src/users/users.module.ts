import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AppwriteModule } from '../appwrite/appwrite.module';

/**
 * Users Module.
 * Provides user management functionality.
 * 
 * Dependencies:
 * - PrismaModule (global) for database access
 * - AuditLogsModule (global) for audit logging
 * - AppwriteModule for file uploads
 */
@Module({
    imports: [AppwriteModule],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService], // Exported for use in AuthModule
})
export class UsersModule { }
