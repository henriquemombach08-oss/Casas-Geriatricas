'use client';

import type { FinancialSummary } from '@/types/financial';
import { formatCurrency } from '@/types/financial';

interface Props {
  cashFlow?: FinancialSummary['cash_flow'];
}

export default function CashFlowChart({ cashFlow }: Props) {
  if (!cashFlow) {
    return (
      <div className="card flex items-center justify-center py-12 text-stone-400 text-sm">
        Sem dados de fluxo de caixa
      </div>
    );
  }

  const max = Math.max(cashFlow.this_month, cashFlow.last_month, 1);
  const thisMonthPct = (cashFlow.this_month / max) * 100;
  const lastMonthPct = (cashFlow.last_month / max) * 100;
  const isUp = cashFlow.trend === 'up';
  const diff = cashFlow.this_month - cashFlow.last_month;
  const diffPct = cashFlow.last_month > 0
    ? ((diff / cashFlow.last_month) * 100).toFixed(1)
    : '—';

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between">
        <h2 className="font-bold text-stone-900">Fluxo de Caixa</h2>
        <span className={`text-sm font-semibold ${isUp ? 'text-green-600' : 'text-red-600'}`}>
          {isUp ? '↑' : '↓'} {diffPct}%
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm text-stone-600 mb-1">
            <span>Este mês</span>
            <span className="font-semibold">{formatCurrency(cashFlow.this_month)}</span>
          </div>
          <div className="h-4 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${thisMonthPct}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm text-stone-600 mb-1">
            <span>Mês passado</span>
            <span className="font-semibold">{formatCurrency(cashFlow.last_month)}</span>
          </div>
          <div className="h-4 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-stone-400 rounded-full transition-all"
              style={{ width: `${lastMonthPct}%` }}
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-stone-500">
        Diferença: <span className={`font-semibold ${isUp ? 'text-green-600' : 'text-red-600'}`}>
          {isUp ? '+' : ''}{formatCurrency(diff)}
        </span>
      </p>
    </div>
  );
}
