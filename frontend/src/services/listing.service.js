import { apiClient } from './api.js';

export const listingApi = {
  getAllActive: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.category) searchParams.append('category', params.category);
    if (params.search) searchParams.append('search', params.search);
    const query = searchParams.toString();
    return apiClient(`/listings${query ? `?${query}` : ''}`);
  },

  getById: (id) => apiClient(`/listings/${id}`),

  getMyListings: () => apiClient('/listings/seller/my'),

  create: (data) =>
    apiClient('/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    apiClient(`/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deactivate: (id) =>
    apiClient(`/listings/${id}`, {
      method: 'DELETE',
    }),

  reactivate: (id) =>
    apiClient(`/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'ACTIVE' }),
    }),
};
