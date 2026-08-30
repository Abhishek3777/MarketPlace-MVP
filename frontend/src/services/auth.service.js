import { apiClient } from './api.js';

export const authApi = {
  login: (credentials) =>
    apiClient('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (userData) =>
    apiClient('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  logout: () =>
    apiClient('/auth/logout', {
      method: 'POST',
    }),

  getMe: () =>
    apiClient('/auth/me', {
      method: 'GET',
    }),
};
