'use client';

import { useState } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { useCreateSchedules } from '@/hooks/useSchedules';
import { SHIFT_LABELS } from '@/types/schedule';
import type { WorkShift, CreateScheduleEntry } from '@/types/schedule';

interface Props {
  month: string; // YYYY-MM
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ScheduleRow {
  user_id: string;
  schedule_date: string;
  shift: WorkShift;
  notes: string;
}

const SHIFTS: WorkShift[] = ['morning', 'afternoon', 'night', 'full_day', 'on_call'];

function datesInMonth(month: string): string[] {
  const [year, mon] = month.split('-').map(Number);
  const days = new Date(year!, mon!, 0).getDate();
  return Array.from({ length: days }, (_, i) => {
    const d = i + 1;
    return `${month}-${String(d).padStart(2, '0')}`;
  });
}

export default function ScheduleForm({ month, onSuccess, onCancel }: Props) {
  const { data: users = [], isLoading: loadingUsers } = useUsers({ active: 'true' });
  const createSchedules = useCreateSchedules();

  const [rows, setRows] = useState<ScheduleRow[]>([
    { user_id: '', schedule_date: '', shift: 'morning', notes: '' },
  ]);
  const [error, setError] = useState<string | null>(null);

  const dates = datesInMonth(month);

  const updateRow = (i: number, field: keyof ScheduleRow, value: string) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { user_id: '', schedule_date: '', shift: 'morning', notes: '' }]);
  };

  const removeRow = (i: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = () => {
    const valid = rows.filter((r) => r.user_id && r.schedule_date);
    if (valid.length === 0) {
      setError('Adicione pelo menos uma entrada válida.');
      return;
    }
    setError(null);
    const schedules: CreateScheduleEntry[] = valid.map((r) => ({
      user_id: r.user_id,
      schedule_date: r.schedule_date,
      shift: r.shift,
      notes: r.notes || undefined,
    }));
    createSchedules.mutate(
      { schedules, month },
      {
        onSuccess: () => onSuccess?.(),
        onError: (err) => setError(String(err)),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500 border-b">
              <th className="pb-2 pr-3 font-medium">Funcionário</th>
              <th className="pb-2 pr-3 font-medium">Data</th>
              <th className="pb-2 pr-3 font-medium">Turno</th>
              <th className="pb-2 pr-3 font-medium">Obs.</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody className="space-y-2">
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 pr-3">
                  <select
                    value={row.user_id}
                    onChange={(e) => updateRow(i, 'user_id', e.target.value)}
                    className="input w-40"
                    disabled={loadingUsers}
                  >
                    <option value="">Selecionar...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-3">
                  <select
                    value={row.schedule_date}
                    onChange={(e) => updateRow(i, 'schedule_date', e.target.value)}
                    className="input w-32"
                  >
                    <option value="">Selecionar...</option>
                    {dates.map((d) => (
                      <option key={d} value={d}>
                        {new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-3">
                  <select
                    value={row.shift}
                    onChange={(e) => updateRow(i, 'shift', e.target.value as WorkShift)}
                    className="input w-40"
                  >
                    {SHIFTS.map((s) => (
                      <option key={s} value={s}>
                        {SHIFT_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="text"
                    value={row.notes}
                    onChange={(e) => updateRow(i, 'notes', e.target.value)}
                    placeholder="Opcional"
                    className="input w-36"
                  />
                </td>
                <td className="py-2">
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-red-400 hover:text-red-600 px-1"
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" onClick={addRow} className="text-sm text-blue-600 hover:underline">
        + Adicionar linha
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary flex-1">
            Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={createSchedules.isPending}
          className="btn-primary flex-1"
        >
          {createSchedules.isPending ? 'Salvando...' : `Criar Escala (${rows.filter((r) => r.user_id && r.schedule_date).length})`}
        </button>
      </div>
    </div>
  );
}
