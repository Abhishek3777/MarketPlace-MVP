import { apiClient } from './api.js';

export const orderApi = {
  create: (listingId) =>
    apiClient('/orders', {
      method: 'POST',
      body: JSON.stringify({ listingId }),
    }),

  getOrders: () => apiClient('/orders'),

  getById: (id) => apiClient(`/orders/${id}`),

  complete: (id) =>
    apiClient(`/orders/${id}/complete`, {
      method: 'PATCH',
    }),
};
