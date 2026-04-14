'use client';

import { useState } from 'react';
import { useSendReminder } from '@/hooks/useFinancial';
import type { FinancialRecord } from '@/types/financial';
import { formatCurrency } from '@/types/financial';

const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'sms',      label: 'SMS' },
  { id: 'email',    label: 'E-mail' },
];

interface Props {
  record: FinancialRecord;
  residentName: string;
  onClose: () => void;
}

export default function PaymentReminder({ record, residentName, onClose }: Props) {
  const [channels, setChannels] = useState<string[]>(['whatsapp']);
  const [sent, setSent] = useState<string[] | null>(null);
  const sendReminder = useSendReminder();

  const toggleChannel = (ch: string) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );
  };

  const handle = () => {
    sendReminder.mutate(
      { id: record.id, channels },
      {
        onSuccess: (data) => setSent(data.channels_sent),
      },
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold text-gray-900">Enviar Lembrete de Cobrança</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {sent ? (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-300 rounded-lg p-4 text-sm space-y-1">
              <p className="font-bold text-green-800">Lembrete enviado para {residentName}!</p>
              <p className="text-gray-600">Canais: {sent.join(', ') || '—'}</p>
            </div>
            <button onClick={onClose} className="w-full btn-primary">Fechar</button>
          </div>
        ) : (
          <>
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <p className="font-semibold">{residentName}</p>
              <p className="text-gray-600">{record.description} — {formatCurrency(record.amount)}</p>
              {record.dueDate && (
                <p className="text-red-600 text-xs">
                  Vencimento: {new Date(record.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Canais de envio:</p>
              <div className="flex gap-3">
                {CHANNELS.map((ch) => (
                  <label key={ch.id} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channels.includes(ch.id)}
                      onChange={() => toggleChannel(ch.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{ch.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {sendReminder.isError && (
              <p className="text-sm text-red-600">Erro ao enviar. Tente novamente.</p>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 btn-secondary">Cancelar</button>
              <button
                onClick={handle}
                disabled={sendReminder.isPending || channels.length === 0}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {sendReminder.isPending ? 'Enviando...' : 'Enviar Lembrete'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
