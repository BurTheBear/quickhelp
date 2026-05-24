import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const adminAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  getDashboard: () => api.get('/admin/dashboard'),
  getAnalytics: () => api.get('/admin/analytics'),
  listUsers: (params: Record<string, unknown>) => api.get('/admin/users', { params }),
  updateUserStatus: (id: string, status: string) => api.patch(`/admin/users/${id}/status`, { status }),
  updateUserRole: (id: string, role: string) => api.patch(`/admin/users/${id}/role`, { role }),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  listRequests: (params: Record<string, unknown>) => api.get('/admin/requests', { params }),
  flagRequest: (id: string) => api.patch(`/admin/requests/${id}/flag`),
  unflagRequest: (id: string) => api.patch(`/admin/requests/${id}/unflag`),
  deleteRequest: (id: string) => api.delete(`/admin/requests/${id}`),
  listReports: (params: Record<string, unknown>) => api.get('/admin/reports', { params }),
  resolveReport: (id: string, notes?: string) => api.patch(`/admin/reports/${id}/resolve`, { notes }),
  dismissReport: (id: string) => api.patch(`/admin/reports/${id}/dismiss`),
};
