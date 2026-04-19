'use client';

import { useState } from 'react';
import type { WorkSchedule } from '@/types/schedule';
import { ShiftBadge } from './ShiftBadge';
import { useConfirmSchedule } from '@/hooks/useSchedules';

interface Props {
  schedule: WorkSchedule;
  onClose: () => void;
}

export default function ConfirmationModal({ schedule, onClose }: Props) {
  const [notes, setNotes] = useState('');
  const confirm = useConfirmSchedule();

  const dateStr = new Date(schedule.scheduleDate + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  const handle = (confirmed: boolean) => {
    confirm.mutate(
      { id: schedule.id, confirmed, notes: notes || undefined },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold text-stone-900">Confirmar Escala</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="bg-stone-50 rounded-lg p-4 space-y-2">
          <p className="font-semibold text-stone-900 capitalize">{dateStr}</p>
          <ShiftBadge shift={schedule.shift} />
          {schedule.notes && (
            <p className="text-sm text-stone-600 italic mt-1">{schedule.notes}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Observação (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Tudo certo para esse dia"
            className="w-full text-sm border rounded-lg p-2"
            rows={2}
          />
        </div>

        {confirm.isError && (
          <p className="text-sm text-red-600">Erro ao confirmar. Tente novamente.</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => handle(false)}
            disabled={confirm.isPending}
            className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50"
          >
            Não posso ir
          </button>
          <button
            onClick={() => handle(true)}
            disabled={confirm.isPending}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {confirm.isPending ? 'Confirmando...' : 'Confirmar presença'}
          </button>
        </div>
      </div>
    </div>
  );
}
