'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';

interface ApiResponse<T> { success: boolean; data: T; }

function StatCard({ label, value, sub, href, icon }: {
  label: string; value: number | string; sub?: string; href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="card hover:shadow-md transition-shadow group flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
        <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-stone-900 dark:text-stone-50">{value}</p>
        {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
      </div>
      <p className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        Ver detalhes →
      </p>
    </Link>
  );
}

export default function DashboardPage() {
  const user = getStoredUser();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [residentsRes, staffRes, visitorsRes] = await Promise.all([
        api.get<ApiResponse<{ residents: { id: string }[]; pagination: { total: number } }>>('/residents?limit=1&status=active'),
        api.get<ApiResponse<{ id: string }[]>>('/users?active=true'),
        api.get<ApiResponse<{ id: string; checkedInAt?: string; checkedOutAt?: string }[]>>('/visitors?limit=100'),
      ]);
      const residents = residentsRes.data.data?.pagination?.total ?? 0;
      const staffCount = staffRes.data.data?.length ?? 0;
      const allVisitors = visitorsRes.data.data ?? [];
      const today = new Date().toDateString();
      const visitorsToday = allVisitors.filter(v => v.checkedInAt && new Date(v.checkedInAt).toDateString() === today).length;
      const insideNow = allVisitors.filter(v => v.checkedInAt && !v.checkedOutAt).length;
      return { residents, staffCount, visitorsToday, insideNow };
    },
    refetchInterval: 60_000,
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <p className="section-title">Visão geral</p>
        <h1 className="page-title">
          {greeting}{firstName ? `, ${firstName}` : ''}.
        </h1>
        <p className="mt-1 text-sm text-stone-500">Como está a casa hoje?</p>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-32 animate-pulse bg-stone-100 dark:bg-stone-800 border-0" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Residentes ativos"
            value={stats?.residents ?? 0}
            href="/residents"
            icon={
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.973 5.973 0 004 17v1H1v-1a3 3 0 013.75-2.906z" />
              </svg>
            }
          />
          <StatCard
            label="Funcionários"
            value={stats?.staffCount ?? 0}
            href="/staff"
            icon={
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
              </svg>
            }
          />
          <StatCard
            label="Visitantes hoje"
            value={stats?.visitorsToday ?? 0}
            sub={`${stats?.insideNow ?? 0} dentro agora`}
            href="/visitors"
            icon={
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            }
          />
          <StatCard
            label="Agenda de medicamentos"
            value="Ver agenda"
            href="/medications/schedule"
            icon={
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            }
          />
        </div>
      )}

      {/* Quick actions */}
      <div className="card">
        <p className="section-title">Ações rápidas</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Novo residente',
              href: '/residents/new',
              bg: 'bg-primary-100 text-primary hover:bg-primary-200',
            },
            {
              label: 'Registrar visita',
              href: '/visitors',
              bg: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
            },
            {
              label: 'Nova cobrança',
              href: '/financial/charges/new',
              bg: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
            },
            {
              label: 'Novo funcionário',
              href: '/staff',
              bg: 'bg-stone-100 text-stone-700 hover:bg-stone-200',
            },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={`rounded-xl px-4 py-3.5 text-sm font-semibold text-center transition-colors ${a.bg}`}
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
