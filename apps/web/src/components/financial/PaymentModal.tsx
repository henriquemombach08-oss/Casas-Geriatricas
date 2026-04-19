'use client';

import { useState } from 'react';
import { useUpdateFinancial } from '@/hooks/useFinancial';
import { PAYMENT_METHOD_LABELS } from '@/types/financial';
import type { PaymentMethod, FinancialRecord } from '@/types/financial';

const PAYMENT_METHODS: PaymentMethod[] = [
  'pix', 'bank_transfer', 'cash', 'credit_card', 'debit_card', 'boleto', 'check', 'other',
];

interface Props {
  record: FinancialRecord;
  residentName: string;
  onClose: () => void;
}

export default function PaymentModal({ record, residentName, onClose }: Props) {
  const today = new Date().toISOString().split('T')[0]!;
  const [paidDate, setPaidDate] = useState(today);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [notes, setNotes] = useState('');
  const update = useUpdateFinancial();

  const handle = () => {
    update.mutate(
      {
        id: record.id,
        status: 'paid',
        paid_date: paidDate,
        payment_method: paymentMethod,
        notes: notes || undefined,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold text-stone-900">Registrar Pagamento</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="bg-stone-50 rounded-lg p-3 text-sm space-y-1">
          <p className="font-semibold">{residentName}</p>
          <p className="text-stone-600">{record.description}</p>
          <p className="text-lg font-bold text-stone-900">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(record.amount)}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Data do pagamento</label>
          <input
            type="date"
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
            className="input w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Forma de pagamento</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            className="input w-full"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Observações</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: comprovante enviado por WhatsApp"
            className="w-full text-sm border rounded-lg p-2"
            rows={2}
          />
        </div>

        {update.isError && (
          <p className="text-sm text-red-600">Erro ao registrar. Tente novamente.</p>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancelar</button>
          <button
            onClick={handle}
            disabled={update.isPending || !paidDate}
            className="flex-1 btn-primary disabled:opacity-50"
          >
            {update.isPending ? 'Salvando...' : 'Confirmar Pagamento'}
          </button>
        </div>
      </div>
    </div>
  );
}
