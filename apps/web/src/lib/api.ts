import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api';

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error: unknown) => {
    const err = error as { response?: { status: number }; config?: { _retry?: boolean } & Record<string, unknown> };
    if (err.response?.status === 401 && err.config && !err.config['_retry']) {
      err.config['_retry'] = true;
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
      if (refreshToken) {
        try {
          const { data } = await axios.post<{ data: { token: string; refreshToken: string } }>(
            `${BASE_URL}/auth/refresh-token`,
            { refreshToken },
          );
          localStorage.setItem('token', data.data.token);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          if (err.config) {
            (err.config as Record<string, unknown>)['headers'] = {
              ...(err.config['headers'] as Record<string, unknown>),
              Authorization: `Bearer ${data.data.token}`,
            };
            return api(err.config as unknown as import('axios').AxiosRequestConfig);
          }
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);
