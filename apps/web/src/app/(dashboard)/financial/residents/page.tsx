'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useResidents } from '@/hooks/useResidents';
import { useResidentFinancial } from '@/hooks/useFinancial';
import ResidentBalanceCard from '@/components/financial/ResidentBalanceCard';

function ResidentRow({ residentId, residentName }: { residentId: string; residentName: string }) {
  const { data } = useResidentFinancial(residentId, 3, 'pending');

  if (!data) return null;

  const pending = data.records.filter((r) => r.status === 'pending' || r.status === 'partially_paid');
  const overdue = data.records.filter((r) => r.status === 'overdue');
  if (pending.length === 0 && overdue.length === 0) return null;

  return (
    <ResidentBalanceCard
      residentId={residentId}
      residentName={residentName}
      pendingRecords={pending}
      overdueRecords={overdue}
    />
  );
}

export default function FinancialResidentsPage() {
  const [search, setSearch] = useState('');
  const { data } = useResidents({ page: 1, limit: 200, status: 'active', search });

  const residents = data?.residents ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Residentes — Financeiro</h1>
          <p className="text-sm text-stone-500 mt-1">Pendências e inadimplência</p>
        </div>
        <Link href="/financial" className="btn-secondary text-sm">← Voltar</Link>
      </div>

      <div className="card py-3">
        <input
          type="search"
          placeholder="Buscar residente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-full md:w-80"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {residents.map((r) => (
          <ResidentRow key={r.id} residentId={r.id} residentName={r.name} />
        ))}
      </div>

      {residents.length === 0 && (
        <div className="card text-center py-12 text-stone-400">Nenhum residente encontrado.</div>
      )}
    </div>
  );
}
