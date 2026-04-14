import axios from 'axios';

export interface AppUser {
  id: string;
  name: string;
  role: string;
  phone?: string;
  email: string;
  active: boolean;
}

const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const UsersAPI = {
  list: async (params?: { role?: string; active?: string }): Promise<AppUser[]> => {
    const { data } = await api.get<{ success: boolean; data: AppUser[] }>('/users', { params });
    return data.data;
  },
};
