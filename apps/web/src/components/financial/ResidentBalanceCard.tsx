'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/types/financial';
import type { FinancialRecord } from '@/types/financial';
import PaymentModal from './PaymentModal';

interface Props {
  residentId: string;
  residentName: string;
  pendingRecords: FinancialRecord[];
  overdueRecords: FinancialRecord[];
}

export default function ResidentBalanceCard({
  residentId,
  residentName,
  pendingRecords,
  overdueRecords,
}: Props) {
  const [payRecord, setPayRecord] = useState<FinancialRecord | null>(null);

  const pendingAmount = pendingRecords.reduce((sum, r) => sum + r.amount, 0);
  const overdueAmount = overdueRecords.reduce((sum, r) => sum + r.amount, 0);
  const hasOverdue = overdueAmount > 0;

  const topRecord = overdueRecords[0] ?? pendingRecords[0];

  return (
    <>
      <div className={`border-2 rounded-xl p-4 space-y-3 ${hasOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-gray-900">{residentName}</p>
            <Link href={`/financial/residents/${residentId}`} className="text-xs text-blue-600 hover:underline">
              Ver histórico →
            </Link>
          </div>
          {hasOverdue && (
            <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
              ATRASADO
            </span>
          )}
        </div>

        <div className="space-y-1 text-sm">
          {overdueAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-red-600">Atrasado:</span>
              <span className="font-bold text-red-700">{formatCurrency(overdueAmount)}</span>
            </div>
          )}
          {pendingAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Pendente:</span>
              <span className="font-semibold">{formatCurrency(pendingAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1 font-bold">
            <span>Total:</span>
            <span>{formatCurrency(pendingAmount + overdueAmount)}</span>
          </div>
        </div>

        {topRecord && (
          <button
            onClick={() => setPayRecord(topRecord)}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            Registrar Pagamento
          </button>
        )}
      </div>

      {payRecord && (
        <PaymentModal
          record={payRecord}
          residentName={residentName}
          onClose={() => setPayRecord(null)}
        />
      )}
    </>
  );
}
