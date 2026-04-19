'use client';

import { SHIFT_LABELS, STATUS_COLORS, STATUS_LABELS } from '@/types/schedule';
import type { WorkShift, ScheduleStatus } from '@/types/schedule';

export function ShiftBadge({ shift }: { shift: WorkShift }) {
  const colors: Record<WorkShift, string> = {
    morning:   'bg-amber-100 text-amber-800',
    afternoon: 'bg-blue-100 text-blue-800',
    night:     'bg-indigo-100 text-indigo-800',
    full_day:  'bg-purple-100 text-purple-800',
    on_call:   'bg-stone-100 text-stone-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[shift]}`}>
      {SHIFT_LABELS[shift]}
    </span>
  );
}

export function ScheduleStatusBadge({ status }: { status: ScheduleStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
