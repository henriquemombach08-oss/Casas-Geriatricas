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
    refetchInterval: 60_000, // poll every minute
  });

  const unreadCount = notifications?.length ?? 0;

  return (
    <header className="h-14 bg-white dark:bg-gray-900 border-b border-[--border] flex items-center px-6 gap-4">
      {/* Search */}
      <div className="flex-1">
        <input
          type="search"
          placeholder="Buscar residentes, funcionários..."
          className="w-full max-w-sm input py-1.5 text-sm"
        />
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={toggleTheme}
        aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-lg"
        title={isDark ? 'Modo claro' : 'Modo escuro'}
      >
        {isDark ? '☀️' : '🌙'}
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="text-xl">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {showNotifications && notifications && notifications.length > 0 && (
          <div className="absolute right-0 top-12 w-80 card shadow-lg z-50 p-0 overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-sm">Notificações</div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className="px-4 py-3 hover:bg-gray-50 border-b last:border-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
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
          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
            {user?.name?.split(' ')[0]}
          </span>
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-12 w-48 card shadow-lg z-50 p-2">
            <div className="px-3 py-2 border-b mb-1">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
