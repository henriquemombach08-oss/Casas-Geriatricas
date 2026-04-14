'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useUpdateFinancial, useCancelFinancial, useGenerateNfe, useSendReminder } from '@/hooks/useFinancial';
import { STATUS_LABELS, STATUS_COLORS, TYPE_LABELS, CATEGORY_LABELS, PAYMENT_METHOD_LABELS, formatCurrency } from '@/types/financial';
import PaymentModal from '@/components/financial/PaymentModal';
import NFEGenerator from '@/components/financial/NFEGenerator';
import PaymentReminder from '@/components/financial/PaymentReminder';

// This page requires the record — for simplicity we re-use context from parent navigation
// In a real app you'd have a dedicated query hook for a single record
// For now we show a simplified charge detail view

export default function ChargeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const cancel = useCancelFinancial();

  const handleCancel = () => {
    if (!confirm('Cancelar esta cobrança?')) return;
    cancel.mutate(id, { onSuccess: () => router.push('/financial') });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Detalhe da Cobrança</h1>
        <Link href="/financial" className="btn-secondary text-sm">← Voltar</Link>
      </div>

      <div className="card text-center py-8 text-gray-500 space-y-3">
        <p className="text-sm">ID: <span className="font-mono text-xs">{id}</span></p>
        <p className="text-sm">Para ver os detalhes completos, acesse o histórico pelo residente.</p>
        <div className="flex gap-3 justify-center pt-2">
          <Link href="/financial/residents" className="btn-secondary text-sm">
            Ver por residente
          </Link>
          <button
            onClick={handleCancel}
            disabled={cancel.isPending}
            className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
          >
            {cancel.isPending ? 'Cancelando...' : 'Cancelar cobrança'}
          </button>
        </div>
      </div>
    </div>
  );
}
