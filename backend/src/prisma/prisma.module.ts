import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * PrismaModule - Global database access module.
 * 
 * Marked as @Global so PrismaService can be injected anywhere
 * without needing to import this module explicitly in each feature module.
 */
@Global()
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule {}
