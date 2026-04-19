'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useMedicationsByResident } from '@/hooks/useMedications';
import { api } from '@/lib/api';
import type { Medication } from '@/types/medication';

const UNIT_LABELS: Record<string, string> = {
  mg: 'mg', ml: 'ml', comp: 'comp.', gotas: 'gotas',
  mcg: 'mcg', g: 'g', ui: 'UI', other: '',
};

function MedicationRow({ med }: { med: Medication }) {
  return (
    <Link
      href={`/medications/${med.id}`}
      className="flex items-center justify-between p-4 hover:bg-stone-50 transition group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-stone-900">{med.name}</span>
          {med.activeIngredient && (
            <span className="text-sm text-stone-500">({med.activeIngredient})</span>
          )}
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              med.status === 'active'
                ? 'bg-green-100 text-green-700'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            {med.status === 'active' ? 'Ativo' : 'Inativo'}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 mt-1 text-sm text-stone-500">
          {med.dosage && (
            <span>
              {med.dosage}
              {med.measurementUnit && ` ${UNIT_LABELS[med.measurementUnit] ?? ''}`}
            </span>
          )}
          {med.frequencyDescription && <span>{med.frequencyDescription}</span>}
          <span className="font-mono text-xs">
            {med.scheduledTimes.join(' · ')}
          </span>
        </div>
      </div>
      <span className="text-stone-400 group-hover:text-stone-600 text-lg">›</span>
    </Link>
  );
}

function ResidentPicker({ currentId }: { currentId: string }) {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ['residents-picker'],
    queryFn: async () => {
      const res = await api.get<{success: boolean; data: {residents: {id: string; name: string}[]}}>('/residents?limit=100&status=active');
      return res.data.data?.residents ?? [];
    },
  });
  return (
    <select
      className="input max-w-xs"
      value={currentId}
      onChange={e => router.push(e.target.value ? `/medications?residentId=${e.target.value}` : '/medications')}
    >
      <option value="">Todos os residentes...</option>
      {(data ?? []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
    </select>
  );
}

function MedicationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const residentId = searchParams.get('residentId') ?? '';
  const statusFilter = (searchParams.get('status') as 'active' | 'inactive') ?? 'active';

  const { data: medications, isLoading } = useMedicationsByResident(
    residentId,
    statusFilter,
  );

  const setStatus = (s: 'active' | 'inactive') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('status', s);
    router.push(`/medications?${params.toString()}`);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Prescrições</h1>
        <div className="flex gap-2">
          <Link
            href="/medications/schedule"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
          >
            Dashboard
          </Link>
          {residentId && (
            <Link
              href={`/medications/new?residentId=${residentId}`}
              className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg text-sm font-semibold hover:bg-stone-50 transition"
            >
              + Nova prescrição
            </Link>
          )}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Residente</label>
        <ResidentPicker currentId={residentId} />
      </div>

      {residentId && (
        <>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setStatus('active')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                statusFilter === 'active'
                  ? 'bg-blue-600 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setStatus('inactive')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                statusFilter === 'inactive'
                  ? 'bg-stone-700 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Descontinuados
            </button>
          </div>

          <div className="bg-white border rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="text-center py-12 text-stone-400">Carregando...</div>
            ) : !medications || medications.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <p>Nenhuma prescrição {statusFilter === 'active' ? 'ativa' : 'descontinuada'}.</p>
                {statusFilter === 'active' && (
                  <Link
                    href={`/medications/new?residentId=${residentId}`}
                    className="mt-3 inline-block text-blue-600 hover:underline text-sm"
                  >
                    Criar primeira prescrição
                  </Link>
                )}
              </div>
            ) : (
              <ul className="divide-y">
                {medications.map((med) => (
                  <li key={med.id}>
                    <MedicationRow med={med} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function MedicationsPage() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <MedicationsContent />
    </Suspense>
  );
}
