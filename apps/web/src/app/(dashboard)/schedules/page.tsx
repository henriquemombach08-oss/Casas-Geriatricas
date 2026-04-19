'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSchedules } from '@/hooks/useSchedules';
import ScheduleCalendar from '@/components/schedules/ScheduleCalendar';
import ScheduleStats from '@/components/schedules/ScheduleStats';
import AISchedulePanel from '@/components/ai/AISchedulePanel';

function formatMonthLabel(month: string) {
  const [year, mon] = month.split('-').map(Number);
  return new Date(year!, mon! - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function addMonths(month: string, delta: number) {
  const [year, mon] = month.split('-').map(Number);
  const d = new Date(year!, mon! - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function SchedulesPage() {
  const [month, setMonth] = useState(currentMonth);
  const [showAI, setShowAI] = useState(false);
  const { data, isLoading } = useSchedules(month);
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Escala de Trabalho</h1>
          <p className="text-sm text-stone-500 mt-1 capitalize">{formatMonthLabel(month)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAI((v) => !v)}
            className={`btn-secondary text-sm flex items-center gap-1 ${showAI ? 'bg-purple-100 text-purple-700 border-purple-300' : ''}`}
          >
            🤖 IA {showAI ? '▲' : '▼'}
          </button>
          <Link href="/schedules/confirmations" className="btn-secondary text-sm">
            Pendentes
          </Link>
          <Link href="/schedules/new" className="btn-primary text-sm">
            + Nova Escala
          </Link>
        </div>
      </div>

      {/* Month nav */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMonth((m) => addMonths(m, -1))}
          className="p-2 rounded-lg hover:bg-stone-100 text-stone-600"
        >
          ‹
        </button>
        <button
          onClick={() => setMonth(currentMonth)}
          className="px-3 py-1.5 text-sm rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700"
        >
          Hoje
        </button>
        <button
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="p-2 rounded-lg hover:bg-stone-100 text-stone-600"
        >
          ›
        </button>
        <button
          onClick={() => router.push(`/schedules/${month}`)}
          className="ml-2 text-sm text-blue-600 hover:underline"
        >
          Ver página do mês →
        </button>
      </div>

      {/* AI Panel */}
      {showAI && <AISchedulePanel month={month} />}

      {isLoading ? (
        <div className="card text-center py-12 text-stone-400">Carregando...</div>
      ) : (
        <>
          <ScheduleStats summary={data?.summary} />
          <ScheduleCalendar schedules={data?.schedules ?? []} month={month} />
        </>
      )}
    </div>
  );
}
