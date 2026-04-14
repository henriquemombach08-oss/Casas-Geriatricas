'use client';

import Link from 'next/link';
import { useFinancialSummary } from '@/hooks/useFinancial';
import { formatCurrency } from '@/types/financial';

export default function FinancialReportsPage() {
  const { data: summary, isLoading } = useFinancialSummary();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatório Financeiro</h1>
          <p className="text-sm text-gray-500 mt-1">Visão geral consolidada</p>
        </div>
        <Link href="/financial" className="btn-secondary text-sm">← Voltar</Link>
      </div>

      {isLoading && (
        <div className="card text-center py-12 text-gray-400">Carregando...</div>
      )}

      {summary && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="card space-y-4">
            <h2 className="font-bold text-gray-900">Indicadores do Mês</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {[
                { label: 'Residentes com cobrança', value: String(summary.residents_with_charges) },
                { label: 'Receita programada',       value: formatCurrency(summary.monthly_revenue) },
                { label: 'Recebido',                  value: formatCurrency(summary.received_this_month) },
                { label: 'Pendente',                  value: formatCurrency(summary.pending_amount) },
                { label: 'Inadimplente',              value: formatCurrency(summary.overdue_amount) },
                { label: 'Taxa de adimplência',       value: `${summary.payment_rate.toFixed(1)}%` },
              ].map((kpi) => (
                <div key={kpi.label} className="border rounded-lg p-3">
                  <p className="text-gray-500 text-xs">{kpi.label}</p>
                  <p className="font-bold text-gray-900 text-lg mt-0.5">{kpi.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top debtors table */}
          {summary.top_debtors.length > 0 && (
            <div className="card space-y-3">
              <h2 className="font-bold text-gray-900">Inadimplência</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 font-medium">Residente</th>
                    <th className="pb-2 font-medium text-right">Valor</th>
                    <th className="pb-2 font-medium text-right">Dias</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.top_debtors.map((d, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 text-gray-900">{d.resident_name}</td>
                      <td className="py-2 text-right font-semibold text-red-700">
                        {formatCurrency(d.amount_overdue)}
                      </td>
                      <td className="py-2 text-right text-red-600">{d.days_overdue}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Cash flow */}
          <div className="card space-y-3">
            <h2 className="font-bold text-gray-900">Fluxo de Caixa</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="border rounded-lg p-3">
                <p className="text-gray-500 text-xs">Este mês</p>
                <p className="font-bold text-xl text-gray-900">{formatCurrency(summary.cash_flow.this_month)}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-gray-500 text-xs">Mês passado</p>
                <p className="font-bold text-xl text-gray-900">{formatCurrency(summary.cash_flow.last_month)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Tendência:{' '}
              <span className={summary.cash_flow.trend === 'up' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                {summary.cash_flow.trend === 'up' ? '↑ Alta' : '↓ Baixa'}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
