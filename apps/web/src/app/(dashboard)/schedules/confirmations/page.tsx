'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSchedules } from '@/hooks/useSchedules';
import ScheduleCard from '@/components/schedules/ScheduleCard';
import type { WorkSchedule } from '@/types/schedule';

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function ConfirmationsPage() {
  const month = currentMonth();
  const { data, isLoading } = useSchedules(month);

  const pending: WorkSchedule[] = (data?.schedules ?? []).filter(
    (s) => s.status === 'scheduled',
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Confirmações Pendentes</h1>
          <p className="text-sm text-stone-500 mt-1">
            {pending.length} funcionário{pending.length !== 1 ? 's' : ''} ainda não confirmou
          </p>
        </div>
        <Link href="/schedules" className="btn-secondary text-sm">
          ← Voltar
        </Link>
      </div>

      {isLoading ? (
        <div className="card text-center py-12 text-stone-400">Carregando...</div>
      ) : pending.length === 0 ? (
        <div className="card text-center py-12 text-stone-500">
          Todos confirmados! Nenhuma pendência.
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((s) => (
            <ScheduleCard key={s.id} schedule={s} />
          ))}
        </div>
      )}
    </div>
  );
}
