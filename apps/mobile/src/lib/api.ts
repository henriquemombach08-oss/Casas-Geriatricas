import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    const err = error as { response?: { status: number }; config?: { _retry?: boolean } & Record<string, unknown> };
    if (err.response?.status === 401 && err.config && !err.config['_retry']) {
      err.config['_retry'] = true;
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post<{ data: { token: string; refreshToken: string } }>(
            `${BASE_URL}/auth/refresh-token`,
            { refreshToken },
          );
          await SecureStore.setItemAsync('token', data.data.token);
          await SecureStore.setItemAsync('refreshToken', data.data.refreshToken);
          return api(err.config);
        } catch {
          await SecureStore.deleteItemAsync('token');
          await SecureStore.deleteItemAsync('refreshToken');
        }
      }
    }
    return Promise.reject(error);
  },
);
