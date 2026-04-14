'use client';

import { useState } from 'react';
import type { WorkSchedule } from '@/types/schedule';
import { ShiftBadge, ScheduleStatusBadge } from './ShiftBadge';
import { useCheckIn, useCheckOut, useConfirmSchedule, useRegisterAbsence } from '@/hooks/useSchedules';

interface Props {
  schedule: WorkSchedule;
  showActions?: boolean;
}

export default function ScheduleCard({ schedule, showActions = true }: Props) {
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);
  const [absenceReason, setAbsenceReason] = useState('');

  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const confirm = useConfirmSchedule();
  const absence = useRegisterAbsence();

  const dateStr = new Date(schedule.scheduleDate + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });

  return (
    <div className={`border rounded-lg p-4 space-y-3 ${schedule.status === 'no_show' ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900">{schedule.user?.name ?? '—'}</p>
          <p className="text-sm text-gray-500 capitalize">{schedule.user?.role}</p>
        </div>
        <ScheduleStatusBadge status={schedule.status} />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <ShiftBadge shift={schedule.shift} />
        <span className="text-sm text-gray-600">{dateStr}</span>
        {schedule.startTime && schedule.endTime && (
          <span className="text-sm text-gray-500">{schedule.startTime} – {schedule.endTime}</span>
        )}
        {schedule.is_late && (
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Chegou atrasado</span>
        )}
        {schedule.worked_hours != null && (
          <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
            {schedule.worked_hours.toFixed(1)}h trabalhadas
          </span>
        )}
      </div>

      {schedule.notes && (
        <p className="text-sm text-gray-600 italic">{schedule.notes}</p>
      )}

      {showActions && (
        <div className="flex gap-2 flex-wrap pt-1">
          {schedule.status === 'scheduled' && (
            <button
              onClick={() => confirm.mutate({ id: schedule.id, confirmed: true })}
              disabled={confirm.isPending}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              ✓ Confirmar
            </button>
          )}
          {schedule.status === 'confirmed' && !schedule.checkedInAt && (
            <button
              onClick={() => checkIn.mutate(schedule.id)}
              disabled={checkIn.isPending}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Check-in
            </button>
          )}
          {schedule.status === 'present' && !schedule.checkedOutAt && (
            <button
              onClick={() => checkOut.mutate(schedule.id)}
              disabled={checkOut.isPending}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              Check-out
            </button>
          )}
          {['scheduled', 'confirmed'].includes(schedule.status) && (
            <button
              onClick={() => setShowAbsenceForm(!showAbsenceForm)}
              className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Registrar ausência
            </button>
          )}
        </div>
      )}

      {showAbsenceForm && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-2">
          <textarea
            value={absenceReason}
            onChange={(e) => setAbsenceReason(e.target.value)}
            placeholder="Motivo da ausência..."
            className="w-full text-sm border rounded p-2"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!absenceReason.trim()) return;
                absence.mutate({ id: schedule.id, reason: absenceReason, approved: false });
                setShowAbsenceForm(false);
              }}
              disabled={absence.isPending}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Falta não justificada
            </button>
            <button
              onClick={() => {
                if (!absenceReason.trim()) return;
                absence.mutate({ id: schedule.id, reason: absenceReason, approved: true });
                setShowAbsenceForm(false);
              }}
              disabled={absence.isPending}
              className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              Ausência justificada
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
