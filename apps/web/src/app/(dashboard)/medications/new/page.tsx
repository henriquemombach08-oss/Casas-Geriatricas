'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import MedicationForm from '@/components/medications/MedicationForm';
import { useCreateMedication } from '@/hooks/useMedications';
import type { CreateMedicationInput } from '@/types/medication';

function NewMedicationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const residentId = searchParams.get('residentId') ?? '';

  const { mutate: createMedication, isPending, error } = useCreateMedication();

  const handleSubmit = (data: CreateMedicationInput) => {
    createMedication(data, {
      onSuccess: (medication) => {
        router.push(`/medications/${medication.id}`);
      },
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-stone-500 hover:text-stone-700 flex items-center gap-1 mb-2"
        >
          ← Voltar
        </button>
        <h1 className="text-2xl font-bold text-stone-900">Nova Prescrição</h1>
        <p className="text-stone-500 mt-1 text-sm">
          Preencha todos os dados da prescrição médica com cuidado.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {(error as Error).message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <MedicationForm
          residentId={residentId}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onSubmit={handleSubmit as any}
          isLoading={isPending}
        />
      </div>
    </div>
  );
}

export default function NewMedicationPage() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <NewMedicationContent />
    </Suspense>
  );
}
