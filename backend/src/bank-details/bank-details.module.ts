import { Module } from '@nestjs/common';
import { BankDetailsController } from './bank-details.controller';
import { BankDetailsService } from './bank-details.service';
import { PrismaModule } from '../prisma';

@Module({
    imports: [PrismaModule],
    controllers: [BankDetailsController],
    providers: [BankDetailsService],
    exports: [BankDetailsService],
})
export class BankDetailsModule {}
