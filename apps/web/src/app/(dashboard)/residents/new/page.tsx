'use client';

import { useRouter } from 'next/navigation';
import { ResidentForm } from '@/components/residents/ResidentForm';
import { useCreateResident } from '@/hooks/useResidents';
import type { CreateResidentInput } from '@/types/resident';

export default function NewResidentPage() {
  const router = useRouter();
  const { mutate, isPending } = useCreateResident();

  const handleSubmit = (data: CreateResidentInput) => {
    mutate(data, {
      onSuccess: (resident) => {
        router.push(`/residents/${resident.id}`);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Novo Residente</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Preencha os dados do novo residente
        </p>
      </div>

      <div className="card">
        <ResidentForm onSubmit={handleSubmit} isLoading={isPending} />
      </div>
    </div>
  );
}
