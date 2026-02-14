'use client';

import { api } from './api';
import { HelpdeskTicket } from '@/types';

export interface HelpdeskResponse {
  data: HelpdeskTicket[];
  total: number;
  hasMore: boolean;
}

// ============================
// HELPDESK API
// ============================
/**
 * Helpdesk API
 * @see Backend Controller: backend/src/helpdesk/helpdesk.controller.ts
 * @see Backend Service:    backend/src/helpdesk/helpdesk.service.ts
 */
export const helpdeskApi = {
  /**
   * Get helpdesk tickets with pagination (Admin only)
   */
  getAll: async (limit = 20, offset = 0, status?: string): Promise<HelpdeskResponse> => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    if (status) params.append('status', status);

    const response = await api.get<HelpdeskResponse>(`/helpdesk?${params}`);
    return response.data;
  },

  /**
   * Delete a helpdesk ticket
   */
  delete: async (ticketId: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/helpdesk/${ticketId}`);
    return response.data;
  },

  /**
   * Mark a ticket as resolved
   */
  resolve: async (ticketId: string): Promise<HelpdeskTicket> => {
    const response = await api.patch<HelpdeskTicket>(`/helpdesk/${ticketId}/resolve`);
    return response.data;
  },

  /**
   * Toggle ticket status between resolved and pending
   */
  toggleStatus: async (ticketId: string): Promise<HelpdeskTicket> => {
    const response = await api.patch<HelpdeskTicket>(`/helpdesk/${ticketId}/toggle-status`);
    return response.data;
  },
};
