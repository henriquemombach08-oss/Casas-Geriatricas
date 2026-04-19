'use client';

import Link from 'next/link';
import { useFinancialSummary } from '@/hooks/useFinancial';
import FinancialDashboard from '@/components/financial/FinancialDashboard';
import CashFlowChart from '@/components/financial/CashFlowChart';
import { formatCurrency } from '@/types/financial';

export default function FinancialPage() {
  const { data: summary, isLoading } = useFinancialSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="text-sm text-stone-500 mt-1">
            {summary ? `Referência: ${new Date(summary.month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}` : 'Carregando...'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/financial/residents" className="btn-secondary text-sm">
            Inadimplentes
          </Link>
          <Link href="/financial/charges/new" className="btn-primary text-sm">
            + Nova Cobrança
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="card text-center py-12 text-stone-400">Carregando...</div>
      )}

      {summary && (
        <>
          <FinancialDashboard summary={summary} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cash flow */}
            <CashFlowChart cashFlow={summary.cash_flow} />

            {/* Top debtors */}
            <div className="card space-y-3">
              <h2 className="font-bold text-stone-900">Maiores Devedores</h2>
              {summary.top_debtors.length === 0 ? (
                <p className="text-sm text-stone-500 py-4 text-center">Nenhuma inadimplência.</p>
              ) : (
                <div className="space-y-2">
                  {summary.top_debtors.map((d, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm text-stone-900">{d.resident_name}</p>
                        <p className="text-xs text-red-600">{d.days_overdue} dias atrasado</p>
                      </div>
                      <span className="font-bold text-red-700 text-sm">
                        {formatCurrency(d.amount_overdue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { href: '/financial/residents', label: 'Histórico por Residente', icon: '👴' },
              { href: '/financial/charges/new', label: 'Nova Cobrança', icon: '➕' },
              { href: '/financial/reports', label: 'Relatório Financeiro', icon: '📊' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="card flex items-center gap-3 hover:bg-stone-50 transition-colors"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="font-medium text-sm text-stone-700">{item.label}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
