'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSchedules } from '@/hooks/useSchedules';
import ScheduleCalendar from '@/components/schedules/ScheduleCalendar';
import ScheduleStats from '@/components/schedules/ScheduleStats';

function formatMonthLabel(month: string) {
  const [year, mon] = month.split('-').map(Number);
  return new Date(year!, mon! - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export default function ScheduleMonthPage() {
  const { month } = useParams<{ month: string }>();
  const { data, isLoading } = useSchedules(month);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
            Escala — {formatMonthLabel(month)}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/schedules" className="btn-secondary text-sm">
            ← Voltar
          </Link>
          <Link href="/schedules/new" className="btn-primary text-sm">
            + Nova Escala
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="card text-center py-12 text-gray-400">Carregando...</div>
      ) : (
        <>
          <ScheduleStats summary={data?.summary} />
          <ScheduleCalendar schedules={data?.schedules ?? []} month={month} />
        </>
      )}
    </div>
  );
}
