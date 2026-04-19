'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ChargeForm from '@/components/financial/ChargeForm';

function NewChargeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const residentId = searchParams.get('resident');

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Nova Cobrança</h1>
          <p className="text-sm text-stone-500 mt-1">Registrar cobrança ou pagamento</p>
        </div>
        <Link
          href={residentId ? `/financial/residents/${residentId}` : '/financial'}
          className="btn-secondary text-sm"
        >
          ← Voltar
        </Link>
      </div>

      <div className="card">
        <ChargeForm
          onSuccess={() =>
            router.push(residentId ? `/financial/residents/${residentId}` : '/financial')
          }
          onCancel={() =>
            router.push(residentId ? `/financial/residents/${residentId}` : '/financial')
          }
        />
      </div>
    </div>
  );
}

export default function NewChargePage() {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-stone-100" />}>
      <NewChargeContent />
    </Suspense>
  );
}
