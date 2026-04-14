'use client';

import type { ScheduleSummary } from '@/types/schedule';

interface Props {
  summary?: ScheduleSummary;
}

export default function ScheduleStats({ summary }: Props) {
  if (!summary) return null;

  const cards = [
    { label: 'Total Escalado', value: summary.total_scheduled, color: 'bg-blue-50 text-blue-700' },
    { label: 'Confirmados',    value: summary.total_confirmed,  color: 'bg-green-50 text-green-700' },
    { label: 'Presentes',      value: summary.total_present,    color: 'bg-teal-50 text-teal-700' },
    { label: 'Faltas',         value: summary.total_no_show,    color: 'bg-red-50 text-red-700' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-lg p-4 ${card.color}`}>
          <p className="text-sm font-medium opacity-75">{card.label}</p>
          <p className="text-3xl font-bold mt-1">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
