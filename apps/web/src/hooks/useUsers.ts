'use client';

import { useQuery } from '@tanstack/react-query';
import { UsersAPI } from '@/lib/api/users';

export function useUsers(params?: { role?: string; active?: string }) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => UsersAPI.list(params),
    staleTime: 5 * 60_000,
  });
}
