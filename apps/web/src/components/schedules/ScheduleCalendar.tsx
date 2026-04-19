'use client';

import { useState } from 'react';
import type { WorkSchedule } from '@/types/schedule';
import ScheduleCard from './ScheduleCard';

interface Props {
  schedules: WorkSchedule[];
  month: string; // YYYY-MM
}

export default function ScheduleCalendar({ schedules, month }: Props) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const [year, mon] = month.split('-').map(Number);
  const firstDay = new Date(year!, mon! - 1, 1);
  const daysInMonth = new Date(year!, mon!, 0).getDate();
  const startWeekday = firstDay.getDay(); // 0=Sun

  const getSchedulesForDay = (day: number) =>
    schedules.filter((s) => {
      const d = new Date(s.scheduleDate + 'T00:00:00');
      return d.getDate() === day && d.getMonth() === mon! - 1;
    });

  const getDayStyle = (day: number) => {
    const daySchedules = getSchedulesForDay(day);
    if (daySchedules.length === 0) return 'bg-stone-50 text-stone-400';
    const anyNoShow = daySchedules.some((s) => s.status === 'no_show');
    const allDone = daySchedules.every((s) => ['present', 'confirmed'].includes(s.status));
    if (anyNoShow) return 'bg-red-100 border-red-300 text-red-800 font-bold';
    if (allDone)   return 'bg-green-100 border-green-300 text-green-800 font-bold';
    return 'bg-yellow-50 border-yellow-200 text-yellow-800';
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-stone-500 py-2">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startWeekday }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const count = getSchedulesForDay(day).length;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(selectedDay === day ? null : day)}
              className={`
                rounded-lg p-2 text-sm border transition-all cursor-pointer
                ${getDayStyle(day)}
                ${selectedDay === day ? 'ring-2 ring-blue-400' : ''}
              `}
            >
              <p>{day}</p>
              {count > 0 && <p className="text-xs mt-0.5">{count} esc.</p>}
            </button>
          );
        })}
      </div>

      {/* Day detail */}
      {selectedDay !== null && (
        <div className="mt-6 border-t pt-4">
          <h3 className="text-lg font-bold mb-4">
            {new Date(year!, mon! - 1, selectedDay).toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
            })}
          </h3>
          {getSchedulesForDay(selectedDay).length === 0 ? (
            <p className="text-stone-500 text-sm">Nenhuma escala neste dia.</p>
          ) : (
            <div className="space-y-3">
              {getSchedulesForDay(selectedDay).map((s) => (
                <ScheduleCard key={s.id} schedule={s} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
