import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

/**
 * Users Module.
 * Provides user management functionality.
 * 
 * Dependencies:
 * - TypeORM for database access
 * - AuditLogsModule (global) for audit logging
 */
@Module({
    imports: [TypeOrmModule.forFeature([User])],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService], // Exported for use in AuthModule
})
export class UsersModule { }
