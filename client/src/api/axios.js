import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '';

export const studentApi = axios.create({
  baseURL: baseURL + '/api/student',
  headers: { 'Content-Type': 'application/json' },
});
studentApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('studentToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});
studentApi.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401) {
      localStorage.removeItem('studentToken');
      window.location.href = '/student/login';
    }
    return Promise.reject(e);
  }
);

export const adminApi = axios.create({
  baseURL: baseURL + '/api/admin',
  headers: { 'Content-Type': 'application/json' },
});
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
adminApi.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/admin/login';
    }
    return Promise.reject(e);
  }
);

export const authApi = axios.create({
  baseURL: baseURL + '/api/auth',
  headers: { 'Content-Type': 'application/json' },
});
