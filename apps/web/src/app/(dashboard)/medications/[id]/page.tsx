'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMedicationHistory } from '@/hooks/useMedications';
import { useDiscontinueMedication } from '@/hooks/useMedications';
import MedicationHistory from '@/components/medications/MedicationHistory';

const UNIT_LABELS: Record<string, string> = {
  mg: 'mg', ml: 'ml', comp: 'Comprimido', gotas: 'Gotas',
  mcg: 'mcg', g: 'g', ui: 'UI', other: 'Outro',
};

export default function MedicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showDiscontinue, setShowDiscontinue] = useState(false);
  const [discontinueReason, setDiscontinueReason] = useState('');
  const [discontinueError, setDiscontinueError] = useState('');

  const { data, isLoading } = useMedicationHistory(id);
  const { mutate: discontinue, isPending: isDiscontinuing } = useDiscontinueMedication();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-stone-500">Medicamento não encontrado.</div>
    );
  }

  const { medication } = data;

  const handleDiscontinue = () => {
    setDiscontinueError('');
    if (!discontinueReason.trim()) {
      setDiscontinueError('Informe o motivo da descontinuação.');
      return;
    }
    discontinue(
      { id: medication.id, reason: discontinueReason },
      {
        onSuccess: () => {
          setShowDiscontinue(false);
          router.push(`/residents/${medication.residentId}`);
        },
        onError: (err) => setDiscontinueError((err as Error).message),
      },
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="text-sm text-stone-500 hover:text-stone-700 mb-2 flex items-center gap-1"
          >
            ← Voltar
          </button>
          <h1 className="text-2xl font-bold text-stone-900">{medication.name}</h1>
          {medication.activeIngredient && (
            <p className="text-stone-500 text-sm">{medication.activeIngredient}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                medication.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              {medication.status === 'active' ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>

        {medication.status === 'active' && (
          <div className="flex gap-2">
            <Link
              href={`/medications/${medication.id}/edit`}
              className="px-4 py-2 border border-stone-300 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
            >
              Editar
            </Link>
            <button
              onClick={() => setShowDiscontinue(true)}
              className="px-4 py-2 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition"
            >
              Descontinuar
            </button>
          </div>
        )}
      </div>

      {/* Inactive warning */}
      {medication.status === 'inactive' && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
          <p className="font-semibold text-stone-700">Medicamento descontinuado</p>
          {medication.reasonIfInactive && (
            <p className="text-stone-600 text-sm mt-1">
              Motivo: {medication.reasonIfInactive}
            </p>
          )}
        </div>
      )}

      {/* Details */}
      <div className="bg-white border rounded-xl divide-y">
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-stone-500 uppercase tracking-wide">Dose</p>
            <p className="font-semibold text-stone-900">
              {medication.dosage ?? '—'}
              {medication.measurementUnit && ` ${UNIT_LABELS[medication.measurementUnit] ?? medication.measurementUnit}`}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500 uppercase tracking-wide">Frequência</p>
            <p className="font-semibold text-stone-900">
              {medication.frequencyDescription ?? medication.frequency ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500 uppercase tracking-wide">Início</p>
            <p className="font-semibold text-stone-900">
              {new Date(medication.startDate).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500 uppercase tracking-wide">Término</p>
            <p className="font-semibold text-stone-900">
              {medication.endDate
                ? new Date(medication.endDate).toLocaleDateString('pt-BR')
                : 'Uso contínuo'}
            </p>
          </div>
        </div>

        <div className="p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide mb-2">Horários</p>
          <div className="flex flex-wrap gap-2">
            {medication.scheduledTimes.map((t) => (
              <span
                key={t}
                className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-mono font-semibold"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {(medication.prescriberName || medication.prescriberCrm) && (
          <div className="p-4">
            <p className="text-xs text-stone-500 uppercase tracking-wide mb-2">Prescritor</p>
            <p className="font-semibold text-stone-900">{medication.prescriberName}</p>
            {medication.prescriberCrm && (
              <p className="text-sm text-stone-500">CRM {medication.prescriberCrm}</p>
            )}
            {medication.prescriberPhone && (
              <p className="text-sm text-stone-500">{medication.prescriberPhone}</p>
            )}
          </div>
        )}

        {medication.specialInstructions && (
          <div className="p-4 bg-yellow-50">
            <p className="text-xs text-yellow-700 uppercase tracking-wide font-semibold mb-1">
              Instruções especiais
            </p>
            <p className="text-yellow-800 text-sm">{medication.specialInstructions}</p>
          </div>
        )}

        {medication.interactionWarnings && (
          <div className="p-4 bg-red-50">
            <p className="text-xs text-red-700 uppercase tracking-wide font-semibold mb-1">
              Avisos de interação
            </p>
            <p className="text-red-800 text-sm">{medication.interactionWarnings}</p>
          </div>
        )}

        {medication.instructionsForCaregiver && (
          <div className="p-4 bg-blue-50">
            <p className="text-xs text-blue-700 uppercase tracking-wide font-semibold mb-1">
              Instruções para o cuidador
            </p>
            <p className="text-blue-800 text-sm">{medication.instructionsForCaregiver}</p>
          </div>
        )}

        {medication.sideEffects && (
          <div className="p-4">
            <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Efeitos colaterais</p>
            <p className="text-stone-700 text-sm">{medication.sideEffects}</p>
          </div>
        )}
      </div>

      {/* History */}
      <div>
        <h2 className="text-lg font-bold text-stone-900 mb-4">Histórico e aderência</h2>
        <MedicationHistory medicationId={id} />
      </div>

      {/* Discontinue modal */}
      {showDiscontinue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-stone-900 mb-2">
              Descontinuar medicamento
            </h2>
            <p className="text-stone-600 text-sm mb-4">
              O medicamento será desativado. Esta ação será registrada no histórico.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-stone-700 mb-1">
                Motivo *
              </label>
              <textarea
                value={discontinueReason}
                onChange={(e) => setDiscontinueReason(e.target.value)}
                placeholder="Ex: Prescrição finalizada pelo médico, residente de alta..."
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
              />
            </div>
            {discontinueError && (
              <p className="text-red-600 text-sm mb-4">{discontinueError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDiscontinue(false)}
                className="flex-1 px-4 py-2 bg-stone-100 text-stone-700 rounded-lg font-semibold hover:bg-stone-200 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDiscontinue}
                disabled={isDiscontinuing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition"
              >
                {isDiscontinuing ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
