'use client';

import { api } from './api';
import { HelpdeskTicket } from '@/types';

export const helpdeskApi = {
  /**
   * Get all helpdesk tickets (Admin only)
   */
  getAll: async (): Promise<HelpdeskTicket[]> => {
    const response = await api.get<HelpdeskTicket[]>('/helpdesk');
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
