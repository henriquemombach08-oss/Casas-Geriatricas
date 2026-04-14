'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';

interface ApiResponse<T> { success: boolean; data: T; }

function StatCard({ label, value, sub, href, color }: {
  label: string; value: number | string; sub?: string; href: string; color: string;
}) {
  return (
    <Link href={href} className="card hover:shadow-md transition-shadow group">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      <p className="text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Ver detalhes →</p>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {greeting}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">Visão geral da casa geriátrica</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-28 animate-pulse bg-gray-100 dark:bg-gray-700" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Residentes ativos" value={stats?.residents ?? 0}
            href="/residents" color="text-blue-600" />
          <StatCard label="Funcionários" value={stats?.staffCount ?? 0}
            href="/staff" color="text-purple-600" />
          <StatCard label="Visitantes hoje" value={stats?.visitorsToday ?? 0}
            sub={`${stats?.insideNow ?? 0} dentro agora`}
            href="/visitors" color="text-green-600" />
          <StatCard label="Medicamentos" value="Ver agenda"
            href="/medications/schedule" color="text-orange-600" />
        </div>
      )}

      {/* Quick actions */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: '+ Residente',     href: '/residents/new',        color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
            { label: '+ Visita',        href: '/visitors',             color: 'bg-green-50 text-green-700 hover:bg-green-100' },
            { label: '+ Cobrança',      href: '/financial/charges/new', color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
            { label: '+ Funcionário',   href: '/staff',                color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
          ].map(a => (
            <Link key={a.href} href={a.href}
              className={`rounded-xl px-4 py-3 text-sm font-medium text-center transition-colors ${a.color}`}>
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
