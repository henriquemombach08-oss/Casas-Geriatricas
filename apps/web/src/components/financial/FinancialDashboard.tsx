'use client';

import type { FinancialSummary } from '@/types/financial';
import { formatCurrency } from '@/types/financial';

interface Props {
  summary: FinancialSummary;
}

export default function FinancialDashboard({ summary }: Props) {
  const cards = [
    {
      title: 'Receita do Mês',
      value: formatCurrency(summary.monthly_revenue),
      color: 'bg-blue-50 text-blue-700',
      icon: '💰',
    },
    {
      title: 'Recebido',
      value: formatCurrency(summary.received_this_month),
      color: 'bg-green-50 text-green-700',
      icon: '✓',
    },
    {
      title: 'Pendente',
      value: formatCurrency(summary.pending_amount),
      color: 'bg-yellow-50 text-yellow-700',
      icon: '⏳',
    },
    {
      title: 'Atrasado',
      value: formatCurrency(summary.overdue_amount),
      color: 'bg-red-50 text-red-700',
      icon: '⚠',
    },
    {
      title: 'Taxa de Pagamento',
      value: `${summary.payment_rate.toFixed(1)}%`,
      color: 'bg-purple-50 text-purple-700',
      icon: '📊',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card.title} className={`rounded-xl p-4 ${card.color}`}>
          <p className="text-2xl mb-1">{card.icon}</p>
          <p className="text-xs font-medium opacity-75">{card.title}</p>
          <p className="text-xl font-bold mt-1">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
