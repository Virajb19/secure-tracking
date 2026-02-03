/**
 * Paper Setter Service
 * 
 * Handles API calls for paper setter/examiner operations for teachers.
 * 
 * ENDPOINTS:
 * - GET /api/paper-setters/my-invitations - Get pending invitations
 * - POST /api/paper-setters/accept/:id - Accept an invitation
 * - GET /api/bank-details/me - Get current user's bank details
 * - POST /api/bank-details - Submit bank details
 */

import apiClient, { getErrorMessage } from '../api/client';

/**
 * Paper Setter Selection (Invitation) type
 */
export interface PaperSetterInvitation {
    id: string;
    type: 'PAPER_SETTER' | 'HEAD_EXAMINER' | 'ADDITIONAL_HE' | 'SCRUTINIZER';
    subject: string;
    academic_year: string;
    status: 'INVITED' | 'ACCEPTED';
    created_at: string;
}

/**
 * Bank Details type
 */
export interface BankDetails {
    id: string;
    user_id: string;
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    bank_name: string;
    branch_name: string;
    upi_id?: string;
    created_at: string;
    updated_at: string;
}

/**
 * Bank Details Form Data
 */
export interface BankDetailsFormData {
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    bank_name: string;
    branch_name: string;
    upi_id?: string;
}

/**
 * Result type for fetching invitations
 */
export interface FetchInvitationsResult {
    success: boolean;
    invitations?: PaperSetterInvitation[];
    error?: string;
}

/**
 * Result type for accept invitation
 */
export interface AcceptInvitationResult {
    success: boolean;
    error?: string;
}

/**
 * Result type for bank details operations
 */
export interface BankDetailsResult {
    success: boolean;
    bankDetails?: BankDetails;
    error?: string;
}

/**
 * Fetch pending invitations for the current teacher
 */
export async function fetchMyInvitations(): Promise<FetchInvitationsResult> {
    try {
        console.log('[PaperSetter] Fetching my invitations...');
        
        const response = await apiClient.get<PaperSetterInvitation[]>('/paper-setters/my-invitations');
        
        console.log(`[PaperSetter] Fetched ${response.data.length} invitations`);
        
        return {
            success: true,
            invitations: response.data,
        };
    } catch (error) {
        console.log('[PaperSetter] Failed to fetch invitations:', error);
        
        return {
            success: false,
            error: getErrorMessage(error),
        };
    }
}

/**
 * Accept a paper setter invitation
 * @param invitationId - The invitation ID to accept
 */
export async function acceptInvitation(invitationId: string): Promise<AcceptInvitationResult> {
    try {
        console.log(`[PaperSetter] Accepting invitation ${invitationId}...`);
        
        await apiClient.post(`/paper-setters/accept/${invitationId}`);
        
        console.log('[PaperSetter] Invitation accepted successfully');
        
        return {
            success: true,
        };
    } catch (error) {
        console.log('[PaperSetter] Failed to accept invitation:', error);
        
        return {
            success: false,
            error: getErrorMessage(error),
        };
    }
}

/**
 * Get current user's bank details
 */
export async function getMyBankDetails(): Promise<BankDetailsResult> {
    try {
        console.log('[PaperSetter] Fetching my bank details...');
        
        const response = await apiClient.get<BankDetails>('/bank-details/me');
        
        console.log('[PaperSetter] Bank details fetched successfully');
        
        return {
            success: true,
            bankDetails: response.data,
        };
    } catch (error: any) {
        // 404 means no bank details yet - this is okay
        if (error?.response?.status === 404) {
            return {
                success: true,
                bankDetails: undefined,
            };
        }
        
        console.log('[PaperSetter] Failed to fetch bank details:', error);
        
        return {
            success: false,
            error: getErrorMessage(error),
        };
    }
}

/**
 * Submit bank details
 */
export async function submitBankDetails(data: BankDetailsFormData): Promise<BankDetailsResult> {
    try {
        console.log('[PaperSetter] Submitting bank details...');
        
        const response = await apiClient.post<BankDetails>('/bank-details', data);
        
        console.log('[PaperSetter] Bank details submitted successfully');
        
        return {
            success: true,
            bankDetails: response.data,
        };
    } catch (error) {
        console.log('[PaperSetter] Failed to submit bank details:', error);
        
        return {
            success: false,
            error: getErrorMessage(error),
        };
    }
}

/**
 * Update bank details
 */
export async function updateBankDetails(data: BankDetailsFormData): Promise<BankDetailsResult> {
    try {
        console.log('[PaperSetter] Updating bank details...');
        
        const response = await apiClient.patch<BankDetails>('/bank-details', data);
        
        console.log('[PaperSetter] Bank details updated successfully');
        
        return {
            success: true,
            bankDetails: response.data,
        };
    } catch (error) {
        console.log('[PaperSetter] Failed to update bank details:', error);
        
        return {
            success: false,
            error: getErrorMessage(error),
        };
    }
}

/**
 * Accept a paper setter/checker notice from the notices screen
 * @param noticeId - The notice ID to accept
 */
export async function acceptPaperSetterNotice(noticeId: string): Promise<AcceptInvitationResult> {
    try {
        console.log(`[PaperSetter] Accepting paper setter notice ${noticeId}...`);
        
        await apiClient.post(`/notices/${noticeId}/accept`);
        
        console.log('[PaperSetter] Notice accepted successfully');
        
        return {
            success: true,
        };
    } catch (error) {
        console.log('[PaperSetter] Failed to accept notice:', error);
        
        return {
            success: false,
            error: getErrorMessage(error),
        };
    }
}
