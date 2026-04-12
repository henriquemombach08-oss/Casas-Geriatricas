'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/residents', icon: '👴', label: 'Residentes' },
  { href: '/medications', icon: '💊', label: 'Medicamentos' },
  { href: '/schedules', icon: '📅', label: 'Escala' },
  { href: '/financial', icon: '💰', label: 'Financeiro' },
  { href: '/reports', icon: '📊', label: 'Relatórios' },
  { href: '/visitors', icon: '👥', label: 'Visitantes' },
  { href: '/settings', icon: '⚙️', label: 'Configurações' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-[--border] flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[--border]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
            CG
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">CasaGeri</p>
            <p className="text-xs text-gray-400">Gestão geriátrica</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
              )}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
