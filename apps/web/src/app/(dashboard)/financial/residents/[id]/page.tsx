'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useResidentFinancial } from '@/hooks/useFinancial';
import FinancialHistory from '@/components/financial/FinancialHistory';
import { formatCurrency } from '@/types/financial';

export default function ResidentFinancialPage() {
  const { id } = useParams<{ id: string }>();
  const [months, setMonths] = useState(3);
  const { data, isLoading } = useResidentFinancial(id, months);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {data?.resident.name ?? 'Carregando...'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Histórico financeiro</p>
        </div>
        <div className="flex gap-2">
          <Link href="/financial/residents" className="btn-secondary text-sm">← Voltar</Link>
          <Link href={`/financial/charges/new?resident=${id}`} className="btn-primary text-sm">
            + Nova cobrança
          </Link>
        </div>
      </div>

      {/* Summary */}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total cobrado', value: formatCurrency(data.summary.total_charges), color: 'bg-blue-50 text-blue-700' },
            { label: 'Pago',          value: formatCurrency(data.summary.total_paid),    color: 'bg-green-50 text-green-700' },
            { label: 'Pendente',      value: formatCurrency(data.summary.total_pending), color: 'bg-yellow-50 text-yellow-700' },
            { label: 'Atrasado',      value: formatCurrency(data.summary.total_overdue), color: 'bg-red-50 text-red-700' },
          ].map((card) => (
            <div key={card.label} className={`rounded-xl p-4 ${card.color}`}>
              <p className="text-xs font-medium opacity-75">{card.label}</p>
              <p className="text-xl font-bold mt-1">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Period filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Período:</span>
        {[3, 6, 12].map((m) => (
          <button
            key={m}
            onClick={() => setMonths(m)}
            className={`px-3 py-1.5 text-sm rounded-full ${
              months === m ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {m} meses
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="card text-center py-12 text-gray-400">Carregando...</div>
      ) : data ? (
        <FinancialHistory records={data.records} residentName={data.resident.name} />
      ) : null}
    </div>
  );
}
