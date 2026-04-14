'use client';

import { useState } from 'react';
import { useStaffDashboard, useGenerateStaffTimesheet, useExportStaffExcel } from '@/hooks/useReports';
import MetricsGrid from '@/components/reports/MetricsGrid';
import FilterBar from '@/components/reports/FilterBar';
import ExportButtons from '@/components/reports/ExportButtons';
import TableReport from '@/components/reports/TableReport';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import type { StaffDashboard } from '@/types/reports';

const PERFORMANCE_COLORS: Record<string, string> = {
  excellent: 'bg-green-100 text-green-700',
  good:      'bg-blue-100 text-blue-700',
  fair:      'bg-yellow-100 text-yellow-700',
  poor:      'bg-red-100 text-red-700',
};

const PERFORMANCE_LABELS: Record<string, string> = {
  excellent: 'Excelente',
  good:      'Bom',
  fair:      'Regular',
  poor:      'Ruim',
};

type StaffRow = StaffDashboard['individual_staff'][number];

export default function StaffReportPage() {
  const [period, setPeriod] = useState('month');

  const { data: dash, isLoading } = useStaffDashboard(period);
  const generateTimesheet = useGenerateStaffTimesheet();
  const exportExcel = useExportStaffExcel();

  const metrics = dash ? [
    { label: 'Total de Funcionários', value: dash.total_staff, color: 'blue' as const },
    { label: 'Presentes Hoje', value: dash.active_today, color: 'green' as const },
    { label: 'Ausentes Hoje', value: dash.absent_today, color: 'red' as const },
    { label: 'Horas Agendadas', value: `${dash.hours_scheduled}h`, color: 'purple' as const },
    { label: 'Horas Trabalhadas', value: `${Math.round(dash.hours_worked)}h`, color: 'blue' as const },
    { label: 'Taxa de Ausência', value: `${dash.absence_rate}%`, color: dash.absence_rate > 10 ? 'red' as const : 'gray' as const },
  ] : [];

  return (
    <ErrorBoundary>
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatório de Pessoal</h1>
          <p className="mt-1 text-sm text-gray-500">Escalas, horas trabalhadas e desempenho</p>
        </div>
        <ExportButtons
          label="Ponto"
          onExportPDF={() => generateTimesheet.mutateAsync({ period, format: 'pdf' })}
          onExportExcel={() => exportExcel.mutateAsync(period)}
        />
      </div>

      <FilterBar period={period} onPeriodChange={setPeriod} />

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-gray-100" />
      ) : (
        <MetricsGrid metrics={metrics} cols={3} />
      )}

      {dash && dash.by_role.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-800">Por Função</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {dash.by_role.map((r) => (
              <div key={r.role} className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{r.role}</p>
                <p className="mt-1 text-lg font-bold text-gray-800">{r.count}</p>
                <p className="text-xs text-gray-500">{r.utilization_rate}% utilização</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {dash && dash.individual_staff.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-800">Desempenho Individual</h2>
          <TableReport
            columns={[
              { key: 'name', label: 'Funcionário' },
              { key: 'role', label: 'Função' },
              { key: 'hours_scheduled', label: 'Agendado', align: 'right', render: (v) => `${v}h` },
              { key: 'hours_worked', label: 'Trabalhado', align: 'right', render: (v) => `${Math.round(Number(v))}h` },
              { key: 'absence_count', label: 'Faltas', align: 'right' },
              { key: 'punctuality_rate', label: 'Pontual.', align: 'right', render: (v) => `${v}%` },
              {
                key: 'trend',
                label: 'Avaliação',
                align: 'center',
                render: (v) => (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PERFORMANCE_COLORS[String(v)] ?? ''}`}>
                    {PERFORMANCE_LABELS[String(v)] ?? String(v)}
                  </span>
                ),
              },
            ]}
            data={dash.individual_staff as unknown as Record<string, unknown>[]}
            maxRows={25}
          />
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
