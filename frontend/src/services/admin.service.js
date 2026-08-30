import { apiClient } from './api.js';

export const adminApi = {
  getOrders: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.append('status', params.status);
    const query = searchParams.toString();
    return apiClient(`/admin/orders${query ? `?${query}` : ''}`);
  },

  approveOrder: (id) =>
    apiClient(`/admin/orders/${id}/approve`, {
      method: 'PATCH',
    }),

  rejectOrder: (id) =>
    apiClient(`/admin/orders/${id}/reject`, {
      method: 'PATCH',
    }),
};
