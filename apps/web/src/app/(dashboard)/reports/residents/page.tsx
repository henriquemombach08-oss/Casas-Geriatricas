'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useResidentsDashboard, useResidentsOccupancy } from '@/hooks/useReports';
import MetricsGrid from '@/components/reports/MetricsGrid';
import FilterBar from '@/components/reports/FilterBar';
import { Skeleton } from '@/components/shared/Skeleton';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

const OccupancyAreaChart = dynamic(() => import('@/components/reports/charts/OccupancyAreaChart'), {
  loading: () => <Skeleton className="h-52 w-full" />,
  ssr: false,
});
const DistributionPieChart = dynamic(() => import('@/components/reports/charts/DistributionPieChart'), {
  loading: () => <Skeleton className="h-52 w-full" />,
  ssr: false,
});

export default function ResidentsReportPage() {
  const [period, setPeriod] = useState('month');

  const { data: dash, isLoading } = useResidentsDashboard(period);
  const { data: occupancy } = useResidentsOccupancy(6);

  const metrics = dash ? [
    { label: 'Residentes Ativos', value: dash.active_residents, color: 'blue' as const },
    { label: 'Capacidade Total', value: dash.total_capacity, color: 'gray' as const },
    { label: 'Taxa de Ocupação', value: `${dash.occupancy_rate}%`, color: 'purple' as const },
    { label: 'Novas Admissões', value: dash.new_admissions, color: 'green' as const },
    { label: 'Saídas', value: dash.discharges, color: 'red' as const },
    { label: 'Idade Média', value: `${Math.round(dash.average_age)} anos`, color: 'yellow' as const },
  ] : [];

  const ageData = dash?.age_distribution.map((d) => ({ name: d.range, value: d.count })) ?? [];
  const diagData = dash?.diagnoses.slice(0, 6).map((d) => ({ name: d.name, value: d.count })) ?? [];

  return (
    <ErrorBoundary>
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Relatório de Residentes</h1>
        <p className="mt-1 text-sm text-stone-500">Ocupação, perfil dos residentes e distribuição</p>
      </div>

      <FilterBar period={period} onPeriodChange={setPeriod} />

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-stone-100" />
      ) : (
        <MetricsGrid metrics={metrics} cols={3} />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {occupancy && (
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-stone-800">Ocupação — Últimos 6 meses</h2>
            <OccupancyAreaChart
              data={occupancy.monthly_trend}
              capacity={occupancy.total_capacity}
            />
          </div>
        )}

        {ageData.length > 0 && (
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-stone-800">Distribuição por Faixa Etária</h2>
            <DistributionPieChart data={ageData} />
          </div>
        )}

        {diagData.length > 0 && (
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-stone-800">Principais Diagnósticos</h2>
            <DistributionPieChart
              data={diagData}
              colors={['#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6', '#3b82f6', '#ef4444']}
            />
          </div>
        )}

        {dash && dash.care_levels.length > 0 && (
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-stone-800">Nível de Cuidado</h2>
            <DistributionPieChart
              data={dash.care_levels.map((c) => ({ name: c.level, value: c.count }))}
              colors={['#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']}
            />
          </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}
