'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  useFinancialReportDashboard,
  useAccountsReceivable,
  useTopDebtors,
  useFinancialForecast,
  useGenerateFinancialConsolidated,
} from '@/hooks/useReports';
import MetricsGrid from '@/components/reports/MetricsGrid';
import FilterBar from '@/components/reports/FilterBar';
import ExportButtons from '@/components/reports/ExportButtons';
import TableReport from '@/components/reports/TableReport';
import { Skeleton } from '@/components/shared/Skeleton';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

const CashFlowBarChart = dynamic(() => import('@/components/reports/charts/CashFlowBarChart'), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false,
});

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FinancialReportPage() {
  const [period, setPeriod] = useState('month');

  const { data: dash, isLoading } = useFinancialReportDashboard(period);
  const { data: ar } = useAccountsReceivable();
  const { data: debtors } = useTopDebtors(5);
  const { data: forecast } = useFinancialForecast();
  const generateConsolidated = useGenerateFinancialConsolidated();

  const metrics = dash ? [
    { label: 'Receita Total', value: fmt(dash.total_revenue), color: 'green' as const },
    { label: 'Despesas Totais', value: fmt(dash.total_expenses), color: 'red' as const },
    { label: 'Resultado Líquido', value: fmt(dash.net_result), color: dash.net_result >= 0 ? 'blue' as const : 'red' as const },
    { label: 'A Receber', value: fmt(dash.pending_amount), color: 'yellow' as const },
    { label: 'Inadimplente', value: fmt(dash.overdue_amount), color: 'red' as const },
    { label: 'Taxa de Cobrança', value: `${dash.collection_rate}%`, color: 'purple' as const },
  ] : [];

  return (
    <ErrorBoundary>
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Relatório Financeiro</h1>
          <p className="mt-1 text-sm text-stone-500">Fluxo de caixa, inadimplência e previsões</p>
        </div>
        <ExportButtons
          label="Consolidado"
          onExportPDF={() => generateConsolidated.mutateAsync({ period, format: 'pdf' })}
          onExportExcel={() => generateConsolidated.mutateAsync({ period, format: 'xlsx' })}
        />
      </div>

      <FilterBar period={period} onPeriodChange={setPeriod} />

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-stone-100" />
      ) : (
        <MetricsGrid metrics={metrics} cols={3} />
      )}

      {dash && dash.monthly_trend.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-stone-800">Fluxo de Caixa — Tendência</h2>
          <CashFlowBarChart data={dash.monthly_trend} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {forecast && (
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-stone-800">Previsão — Próximo Mês</h2>
            <dl className="space-y-2 text-sm">
              {[
                ['Receita Projetada', fmt(forecast.projected_revenue), 'text-green-700'],
                ['Despesas Projetadas', fmt(forecast.projected_expenses), 'text-red-700'],
                ['Resultado Projetado', fmt(forecast.projected_net), forecast.projected_net >= 0 ? 'text-blue-700' : 'text-red-700'],
                ['Receita Confirmada', fmt(forecast.confirmed_revenue), 'text-stone-700'],
              ].map(([label, value, cls]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-stone-500">{label}</dt>
                  <dd className={`font-semibold ${cls}`}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {debtors && debtors.length > 0 && (
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-stone-800">Maiores Inadimplentes</h2>
            <ul className="space-y-3">
              {debtors.map((d, i) => (
                <li key={d.resident_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-stone-800">{d.resident_name}</span>
                  </div>
                  <span className="text-sm font-semibold text-red-600">{fmt(d.total_pending)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {ar && ar.records.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-stone-800">Contas a Receber</h2>
          <TableReport
            columns={[
              { key: 'resident_name', label: 'Residente' },
              { key: 'description', label: 'Descrição' },
              { key: 'amount', label: 'Valor', align: 'right', render: (v) => fmt(Number(v)) },
              { key: 'due_date', label: 'Vencimento', render: (v) => new Date(String(v)).toLocaleDateString('pt-BR') },
              {
                key: 'days_overdue',
                label: 'Atraso',
                align: 'right',
                render: (v) => Number(v) > 0
                  ? <span className="font-medium text-red-600">{Number(v)} dias</span>
                  : <span className="text-stone-400">—</span>,
              },
            ]}
            data={ar.records as unknown as Record<string, unknown>[]}
            maxRows={15}
          />
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
