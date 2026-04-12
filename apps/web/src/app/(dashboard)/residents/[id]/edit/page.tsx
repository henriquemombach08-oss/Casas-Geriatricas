'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useResident, useUpdateResident } from '@/hooks/useResidents';
import { ResidentForm } from '@/components/residents/ResidentForm';
import type { CreateResidentInput } from '@/types/resident';

interface Props {
  params: { id: string };
}

export default function EditResidentPage({ params }: Props) {
  const { id } = params;
  const router = useRouter();
  const { data: resident, isLoading } = useResident(id);
  const { mutate, isPending } = useUpdateResident(id);

  if (isLoading) {
    return <div className="card text-center py-16 text-gray-400">Carregando...</div>;
  }

  if (!resident) {
    return (
      <div className="card text-center py-16">
        <p className="text-gray-500">Residente não encontrado</p>
        <Link href="/residents" className="text-primary hover:underline text-sm mt-2 block">
          Voltar para lista
        </Link>
      </div>
    );
  }

  const handleSubmit = (data: CreateResidentInput) => {
    mutate(data, {
      onSuccess: () => {
        router.push(`/residents/${id}`);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/residents/${id}`}
          className="text-gray-400 hover:text-gray-600 text-2xl"
        >
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Editar: {resident.name}
          </h1>
          <p className="text-sm text-gray-500">CPF: {resident.cpf}</p>
        </div>
      </div>

      <div className="card">
        <ResidentForm
          defaultValues={{
            name: resident.name,
            cpf: resident.cpf.replace(/\D/g, ''),
            rg: resident.rg,
            birthDate: new Date(resident.birthDate).toISOString().split('T')[0],
            gender: resident.gender,
            maritalStatus: resident.maritalStatus,
            nationality: resident.nationality,
            phone: resident.phone,
            email: resident.email,
            address: resident.address,
            addressNumber: resident.addressNumber,
            addressComplement: resident.addressComplement,
            city: resident.city,
            state: resident.state,
            zipCode: resident.zipCode,
            emergencyContactName: resident.emergencyContactName,
            emergencyContactPhone: resident.emergencyContactPhone,
            emergencyContactRelationship: resident.emergencyContactRelationship,
            emergencyContactEmail: resident.emergencyContactEmail,
            bloodType: resident.bloodType,
            admissionDate: new Date(resident.admissionDate).toISOString().split('T')[0],
            notes: resident.notes,
            specialNeeds: resident.specialNeeds,
          }}
          onSubmit={handleSubmit}
          isLoading={isPending}
          isEdit
        />
      </div>
    </div>
  );
}
