import {
    Controller,
    Get,
    Post,
    Body,
    UseGuards,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles, CurrentUser } from '../shared/decorators';
import { BankDetailsService } from './bank-details.service';

/**
 * Bank Details Controller
 * 
 * Endpoints for managing bank account details.
 */
@Controller('bank-details')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BankDetailsController {
    constructor(private readonly bankDetailsService: BankDetailsService) {}

    /**
     * Save bank details
     * POST /api/bank-details
     */
    @Post()
    @Roles(UserRole.TEACHER, UserRole.HEADMASTER)
    async saveBankDetails(
        @CurrentUser() user: User,
        @Body() body: {
            accountNumber: string;
            accountName: string;
            ifscCode: string;
            bankName: string;
            branchName?: string;
            upiId?: string;
        },
    ) {
        return this.bankDetailsService.saveBankDetails(user.id, body);
    }

    /**
     * Get my bank details (masked)
     * GET /api/bank-details/me
     */
    @Get('me')
    async getMyBankDetails(@CurrentUser() user: User) {
        return this.bankDetailsService.getBankDetails(user.id);
    }

    /**
     * Check if bank details exist
     * GET /api/bank-details/check
     */
    @Get('check')
    async checkBankDetails(@CurrentUser() user: User) {
        const hasBankDetails = await this.bankDetailsService.hasBankDetails(user.id);
        return { has_bank_details: hasBankDetails };
    }
}
