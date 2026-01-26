import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma';

/**
 * Bank Details Service
 * 
 * Handles bank account details for paper setters.
 * Required when accepting paper setter invitation.
 */
@Injectable()
export class BankDetailsService {
    constructor(private readonly db: PrismaService) {}

    /**
     * Save or update bank details
     */
    async saveBankDetails(
        userId: string,
        data: {
            accountNumber: string;
            accountName: string;
            ifscCode: string;
            bankName: string;
            branchName?: string;
            upiId?: string;
        },
    ) {
        // Validate IFSC format
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(data.ifscCode.toUpperCase())) {
            throw new BadRequestException('Invalid IFSC code format');
        }

        // Validate account number (basic check)
        if (data.accountNumber.length < 9 || data.accountNumber.length > 18) {
            throw new BadRequestException('Account number must be 9-18 digits');
        }

        return this.db.bankDetails.upsert({
            where: { user_id: userId },
            create: {
                user_id: userId,
                account_number: data.accountNumber,
                account_name: data.accountName,
                ifsc_code: data.ifscCode.toUpperCase(),
                bank_name: data.bankName,
                branch_name: data.branchName,
                upi_id: data.upiId,
            },
            update: {
                account_number: data.accountNumber,
                account_name: data.accountName,
                ifsc_code: data.ifscCode.toUpperCase(),
                bank_name: data.bankName,
                branch_name: data.branchName,
                upi_id: data.upiId,
            },
        });
    }

    /**
     * Get bank details for a user
     */
    async getBankDetails(userId: string) {
        const details = await this.db.bankDetails.findUnique({
            where: { user_id: userId },
        });

        if (!details) {
            throw new NotFoundException('Bank details not found');
        }

        // Mask sensitive data
        return {
            ...details,
            account_number: this.maskAccountNumber(details.account_number),
        };
    }

    /**
     * Get full bank details (Admin only)
     */
    async getFullBankDetails(userId: string) {
        return this.db.bankDetails.findUnique({
            where: { user_id: userId },
        });
    }

    /**
     * Check if user has bank details
     */
    async hasBankDetails(userId: string): Promise<boolean> {
        const count = await this.db.bankDetails.count({
            where: { user_id: userId },
        });
        return count > 0;
    }

    /**
     * Mask account number for security
     */
    private maskAccountNumber(accountNumber: string): string {
        if (accountNumber.length <= 4) return '****';
        return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
    }
}
