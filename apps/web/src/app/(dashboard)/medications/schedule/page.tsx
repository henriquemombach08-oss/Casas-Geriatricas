'use client';

import { useEffect, useRef, useState } from 'react';
import { useMedicationSchedule } from '@/hooks/useMedications';
import ScheduleBoard from '@/components/medications/ScheduleBoard';

type FilterMode = 'upcoming_30' | 'overdue' | 'all';

export default function MedicationSchedulePage() {
  const [filter, setFilter] = useState<FilterMode>('upcoming_30');
  const alertedRef = useRef(false);

  const minutes = filter === 'upcoming_30' ? 30 : filter === 'overdue' ? 0 : 1440;
  const { data: schedule, isLoading, refetch } = useMedicationSchedule(minutes);

  // Play alert sound when overdue medications are detected
  useEffect(() => {
    if (!schedule) return;
    if (schedule.urgent_count > 0 && !alertedRef.current) {
      alertedRef.current = true;
      try {
        const audio = new Audio('/sounds/medication-alert.mp3');
        audio.play().catch(() => undefined); // ignore autoplay block
      } catch {
        // audio not available
      }
    }
    if (schedule.urgent_count === 0) {
      alertedRef.current = false;
    }
  }, [schedule?.urgent_count]);

  const allMeds = schedule?.next_medications ?? [];
  const filtered =
    filter === 'overdue'
      ? allMeds.filter((m) => m.is_overdue)
      : filter === 'upcoming_30'
        ? allMeds.filter((m) => !m.is_overdue && m.minutes_until <= 30)
        : allMeds;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Medicamentos</h1>
          <p className="text-gray-500 mt-1">
            Próximos medicamentos a serem administrados
          </p>
        </div>
        <button
          onClick={() => void refetch()}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-2 transition"
        >
          Atualizar
        </button>
      </div>

      {/* Urgent banner */}
      {(schedule?.urgent_count ?? 0) > 0 && (
        <div className="mb-6 bg-red-600 text-white rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">{schedule?.urgent_count}</span>
            <div>
              <p className="font-bold text-lg">
                Medicamento{(schedule?.urgent_count ?? 0) !== 1 ? 's' : ''} ATRASADO{(schedule?.urgent_count ?? 0) !== 1 ? 'S' : ''}
              </p>
              <p className="text-red-200 text-sm">Ação imediata necessária</p>
            </div>
          </div>
          <button
            onClick={() => setFilter('overdue')}
            className="px-4 py-2 bg-white text-red-600 rounded-lg font-bold hover:bg-red-50 transition"
          >
            Ver agora
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter('overdue')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            filter === 'overdue'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Atrasados ({schedule?.next_medications.filter((m) => m.is_overdue).length ?? 0})
        </button>
        <button
          onClick={() => setFilter('upcoming_30')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            filter === 'upcoming_30'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Próximos 30 min
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            filter === 'all'
              ? 'bg-gray-700 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todos do dia ({schedule?.total ?? 0})
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">✓</div>
          <p className="text-lg font-medium">
            {filter === 'overdue'
              ? 'Nenhum medicamento atrasado'
              : filter === 'upcoming_30'
                ? 'Nenhum medicamento nos próximos 30 minutos'
                : 'Nenhum medicamento pendente hoje'}
          </p>
        </div>
      ) : (
        <ScheduleBoard
          medications={filtered}
          onAdministered={() => void refetch()}
        />
      )}
    </div>
  );
}
