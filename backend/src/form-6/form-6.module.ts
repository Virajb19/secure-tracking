import { Module } from '@nestjs/common';
import { Form6Controller } from './form-6.controller';
import { Form6Service } from './form-6.service';
import { PrismaModule } from '../prisma';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
    imports: [PrismaModule, AuditLogsModule],
    controllers: [Form6Controller],
    providers: [Form6Service],
    exports: [Form6Service],
})
export class Form6Module {}
