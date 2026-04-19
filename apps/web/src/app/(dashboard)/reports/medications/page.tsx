'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useMedicationsDashboard, useMedicationsAdherence, useGenerateMedicationsPDF, useExportMedicationsExcel } from '@/hooks/useReports';
import MetricsGrid from '@/components/reports/MetricsGrid';
import FilterBar from '@/components/reports/FilterBar';
import ExportButtons from '@/components/reports/ExportButtons';
import TableReport from '@/components/reports/TableReport';
import { Skeleton } from '@/components/shared/Skeleton';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

const AdherenceLineChart = dynamic(() => import('@/components/reports/charts/AdherenceLineChart'), {
  loading: () => <Skeleton className="h-60 w-full" />,
  ssr: false,
});

function currentMonth() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

export default function MedicationsReportPage() {
  const [period, setPeriod] = useState(currentMonth());

  const { data: dash, isLoading: dashLoading } = useMedicationsDashboard(period);
  const { data: adherence } = useMedicationsAdherence(6);
  const generatePDF = useGenerateMedicationsPDF();
  const exportExcel = useExportMedicationsExcel();

  const metrics = dash ? [
    { label: 'Taxa de Adesão', value: `${dash.adherence_rate}%`, color: 'blue' as const },
    { label: 'Administrados', value: dash.total_administered, color: 'green' as const },
    { label: 'Recusados', value: dash.total_refused, color: 'yellow' as const },
    { label: 'Perdidos', value: dash.total_missed, color: 'red' as const },
    { label: 'Medicamentos Ativos', value: dash.active_medications, color: 'purple' as const },
    { label: 'Vencendo em 7 dias', value: dash.expiring_soon, color: 'yellow' as const },
  ] : [];

  return (
    <ErrorBoundary>
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Relatório de Medicamentos</h1>
          <p className="mt-1 text-sm text-stone-500">Adesão ao tratamento e administração de medicamentos</p>
        </div>
        <ExportButtons
          label="Relatório"
          onExportPDF={() => generatePDF.mutateAsync(period)}
          onExportExcel={() => exportExcel.mutateAsync(period)}
        />
      </div>

      <FilterBar period={period} onPeriodChange={setPeriod} showPresets={false} />

      {dashLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-stone-100" />
      ) : (
        <MetricsGrid metrics={metrics} cols={3} />
      )}

      {adherence && adherence.monthly_details.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-stone-800">
            Tendência de Adesão — Últimos 6 meses
            <span className={`ml-2 text-sm font-normal ${
              adherence.trend === 'up' ? 'text-green-600' : adherence.trend === 'down' ? 'text-red-600' : 'text-stone-500'
            }`}>
              ({adherence.trend === 'up' ? '↑ melhorando' : adherence.trend === 'down' ? '↓ piorando' : '→ estável'})
            </span>
          </h2>
          <AdherenceLineChart data={adherence.monthly_details} />
        </div>
      )}

      {dash && dash.by_resident.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-stone-800">Adesão por Residente</h2>
          <TableReport
            columns={[
              { key: 'resident_name', label: 'Residente' },
              { key: 'total_prescribed', label: 'Prescritos', align: 'right' },
              { key: 'administered', label: 'Administrados', align: 'right' },
              { key: 'refused', label: 'Recusados', align: 'right' },
              { key: 'missed', label: 'Perdidos', align: 'right' },
              {
                key: 'adherence_rate',
                label: 'Adesão',
                align: 'right',
                render: (v) => (
                  <span className={`font-semibold ${Number(v) >= 90 ? 'text-green-600' : Number(v) >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {Number(v)}%
                  </span>
                ),
              },
            ]}
            data={dash.by_resident as unknown as Record<string, unknown>[]}
            maxRows={20}
          />
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
