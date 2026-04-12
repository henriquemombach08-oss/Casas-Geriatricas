import type { User } from '@casageri/shared-types';
import { api } from './api';

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token');
}

export function logout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

export async function login(email: string, password: string): Promise<User> {
  const { data } = await api.post<{ data: { token: string; refreshToken: string; user: User } }>(
    '/auth/login',
    { email, password },
  );
  localStorage.setItem('token', data.data.token);
  localStorage.setItem('refreshToken', data.data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.data.user));
  return data.data.user;
}
