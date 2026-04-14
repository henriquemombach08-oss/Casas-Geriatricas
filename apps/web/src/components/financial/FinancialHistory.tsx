'use client';

import { useState } from 'react';
import type { FinancialRecord, FinancialStatus } from '@/types/financial';
import { TYPE_LABELS, STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS, PAYMENT_METHOD_LABELS, formatCurrency } from '@/types/financial';
import PaymentModal from './PaymentModal';
import NFEGenerator from './NFEGenerator';
import PaymentReminder from './PaymentReminder';

interface Props {
  records: FinancialRecord[];
  residentName: string;
}

const STATUS_FILTER_OPTIONS: { value: FinancialStatus | 'all'; label: string }[] = [
  { value: 'all',     label: 'Todos' },
  { value: 'pending', label: 'Pendente' },
  { value: 'overdue', label: 'Atrasado' },
  { value: 'paid',    label: 'Pago' },
  { value: 'canceled', label: 'Cancelado' },
];

export default function FinancialHistory({ records, residentName }: Props) {
  const [filter, setFilter] = useState<FinancialStatus | 'all'>('all');
  const [payRecord, setPayRecord] = useState<FinancialRecord | null>(null);
  const [nfeRecord, setNfeRecord] = useState<FinancialRecord | null>(null);
  const [reminderRecord, setReminderRecord] = useState<FinancialRecord | null>(null);

  const filtered = filter === 'all' ? records : records.filter((r) => r.status === filter);

  return (
    <>
      {/* Status filter */}
      <div className="flex gap-2 flex-wrap mb-4">
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === opt.value
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">Nenhum registro encontrado.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => (
            <div
              key={record.id}
              className={`border rounded-xl p-4 space-y-2 ${
                record.status === 'overdue' ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{record.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {TYPE_LABELS[record.type]} · {CATEGORY_LABELS[record.category]}
                    {record.invoiceNumber && ` · ${record.invoiceNumber}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold ${record.type === 'payment' ? 'text-green-700' : 'text-gray-900'}`}>
                    {record.type === 'payment' ? '+' : ''}{formatCurrency(record.amount)}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[record.status]}`}>
                    {STATUS_LABELS[record.status]}
                  </span>
                </div>
              </div>

              <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                <span>Emissão: {new Date(record.issueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                {record.dueDate && (
                  <span>Vencimento: {new Date(record.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                )}
                {record.paidDate && (
                  <span>Pago em: {new Date(record.paidDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                )}
                {record.paymentMethod && (
                  <span>{PAYMENT_METHOD_LABELS[record.paymentMethod]}</span>
                )}
                {record.days_overdue != null && record.days_overdue > 0 && (
                  <span className="text-red-600 font-semibold">{record.days_overdue}d atrasado</span>
                )}
              </div>

              {record.nfeNumber && (
                <p className="text-xs text-gray-500">NF-e: {record.nfeNumber}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap pt-1">
                {['pending', 'overdue', 'partially_paid'].includes(record.status) && record.type === 'charge' && (
                  <button
                    onClick={() => setPayRecord(record)}
                    className="px-2.5 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Registrar pagamento
                  </button>
                )}
                {record.type === 'charge' && !record.nfeNumber && record.status !== 'canceled' && (
                  <button
                    onClick={() => setNfeRecord(record)}
                    className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Gerar NF-e
                  </button>
                )}
                {['pending', 'overdue'].includes(record.status) && record.type === 'charge' && (
                  <button
                    onClick={() => setReminderRecord(record)}
                    className="px-2.5 py-1 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    Enviar cobrança
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {payRecord && (
        <PaymentModal record={payRecord} residentName={residentName} onClose={() => setPayRecord(null)} />
      )}
      {nfeRecord && (
        <NFEGenerator record={nfeRecord} onClose={() => setNfeRecord(null)} />
      )}
      {reminderRecord && (
        <PaymentReminder record={reminderRecord} residentName={residentName} onClose={() => setReminderRecord(null)} />
      )}
    </>
  );
}
