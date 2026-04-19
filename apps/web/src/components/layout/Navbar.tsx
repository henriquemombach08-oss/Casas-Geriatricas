'use client';

import { useState } from 'react';
import { logout, getStoredUser } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Notification } from '@casageri/shared-types';
import { useTheme } from '@/hooks/useTheme';

export function Navbar() {
  const user = getStoredUser();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDark, toggleTheme] = useTheme();

  const { data: notifications } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const res = await api.get<{ data: Notification[] }>('/notifications?unread=true&limit=10');
      return res.data.data;
    },
    refetchInterval: 60_000,
  });

  const unreadCount = notifications?.length ?? 0;
  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'U';

  return (
    <header className="h-14 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex items-center px-6 gap-4">
      {/* Search */}
      <div className="flex-1">
        <div className="relative w-full max-w-sm">
          <svg
            viewBox="0 0 20 20" fill="currentColor"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none"
          >
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="search"
            placeholder="Buscar residentes, funcionários..."
            className="input pl-9 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={toggleTheme}
        aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
        className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-500 dark:text-stone-400"
      >
        {isDark ? (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-500 dark:text-stone-400"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-white text-xs rounded-full flex items-center justify-center font-semibold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {showNotifications && notifications && notifications.length > 0 && (
          <div className="absolute right-0 top-12 w-80 card shadow-lg z-50 p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-200 font-semibold text-sm text-stone-800">
              Notificações
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
              {notifications.map((n) => (
                <div key={n.id} className="px-4 py-3 hover:bg-stone-50 transition-colors">
                  <p className="text-sm font-medium text-stone-800">{n.title}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{n.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User avatar */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300 hidden sm:block">
            {user?.name?.split(' ')[0]}
          </span>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-stone-400 hidden sm:block">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-12 w-52 card shadow-lg z-50 p-2">
            <div className="px-3 py-2 border-b border-stone-100 mb-1">
              <p className="text-sm font-semibold text-stone-800">{user?.name}</p>
              <p className="text-xs text-stone-500 mt-0.5">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
            >
              Sair da conta
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
