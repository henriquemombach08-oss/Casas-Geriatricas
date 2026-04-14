'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ScheduleForm from '@/components/schedules/ScheduleForm';

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function NewSchedulePage() {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonth);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nova Escala</h1>
          <p className="text-sm text-gray-500 mt-1">Adicione funcionários à escala do mês</p>
        </div>
        <Link href="/schedules" className="btn-secondary text-sm">
          ← Voltar
        </Link>
      </div>

      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mês de referência</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="input w-40"
          />
        </div>

        <ScheduleForm
          month={month}
          onSuccess={() => router.push('/schedules')}
          onCancel={() => router.push('/schedules')}
        />
      </div>
    </div>
  );
}
