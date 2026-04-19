'use client';

import { useParams, useRouter } from 'next/navigation';
import MedicationForm from '@/components/medications/MedicationForm';
import { useMedicationHistory, useUpdateMedication } from '@/hooks/useMedications';
import type { UpdateMedicationInput } from '@/types/medication';

export default function EditMedicationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading } = useMedicationHistory(id, 0);
  const { mutate: updateMedication, isPending, error } = useUpdateMedication(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-6 text-center text-stone-500">Medicamento não encontrado.</div>;
  }

  const { medication } = data;

  if (medication.status === 'inactive') {
    return (
      <div className="p-6 text-center text-stone-500">
        Medicamento inativo não pode ser editado.
      </div>
    );
  }

  const handleSubmit = (formData: UpdateMedicationInput) => {
    updateMedication(formData, {
      onSuccess: () => router.push(`/medications/${id}`),
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
        <h1 className="text-2xl font-bold text-stone-900">Editar Prescrição</h1>
        <p className="text-stone-500 mt-1 text-sm">
          {medication.name} — informe o motivo da alteração.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {(error as Error).message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <MedicationForm
          defaultValues={{
            name: medication.name,
            activeIngredient: medication.activeIngredient,
            dosage: medication.dosage,
            measurementUnit: medication.measurementUnit,
            frequencyDescription: medication.frequencyDescription ?? medication.frequency ?? '',
            timesPerDay: medication.timesPerDay ?? medication.scheduledTimes.length,
            scheduledTimes: medication.scheduledTimes,
            startDate: medication.startDate.split('T')[0],
            endDate: medication.endDate?.split('T')[0],
            prescriptionDate: medication.prescriptionDate?.split('T')[0],
            prescriberName: medication.prescriberName,
            prescriberCrm: medication.prescriberCrm,
            prescriberPhone: medication.prescriberPhone,
            prescriberEmail: medication.prescriberEmail,
            sideEffects: medication.sideEffects,
            contraindications: medication.contraindications,
            interactionWarnings: medication.interactionWarnings,
            specialInstructions: medication.specialInstructions,
            instructionsForCaregiver: medication.instructionsForCaregiver,
            notes: medication.notes,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onSubmit={handleSubmit as any}
          isLoading={isPending}
          isEdit
        />
      </div>
    </div>
  );
}
