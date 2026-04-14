'use client';

import { useState } from 'react';
import { useGenerateNfe } from '@/hooks/useFinancial';
import type { FinancialRecord } from '@/types/financial';
import { formatCurrency } from '@/types/financial';

interface Props {
  record: FinancialRecord;
  onClose: () => void;
}

export default function NFEGenerator({ record, onClose }: Props) {
  const [done, setDone] = useState<{ nfe_number: string; nfe_issued_at: string } | null>(null);
  const generateNfe = useGenerateNfe();

  const handle = () => {
    generateNfe.mutate(record.id, {
      onSuccess: (data) => setDone(data),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold text-gray-900">Gerar NF-e</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {done ? (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-300 rounded-lg p-4 space-y-1 text-sm">
              <p className="font-bold text-green-800">NF-e gerada com sucesso!</p>
              <p className="text-gray-700">Número: <span className="font-mono">{done.nfe_number}</span></p>
              <p className="text-gray-500">
                Emitida em: {new Date(done.nfe_issued_at).toLocaleString('pt-BR')}
              </p>
            </div>
            <button onClick={onClose} className="w-full btn-primary">Fechar</button>
          </div>
        ) : (
          <>
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <p className="font-semibold">{record.description}</p>
              <p className="text-gray-500">{record.invoiceNumber}</p>
              <p className="font-bold text-lg">{formatCurrency(record.amount)}</p>
            </div>

            <p className="text-sm text-gray-600">
              Confirme para emitir a Nota Fiscal de Serviço para esta cobrança.
            </p>

            {generateNfe.isError && (
              <p className="text-sm text-red-600">Erro ao gerar NF-e. Tente novamente.</p>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 btn-secondary">Cancelar</button>
              <button
                onClick={handle}
                disabled={generateNfe.isPending}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {generateNfe.isPending ? 'Gerando...' : 'Gerar NF-e'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
