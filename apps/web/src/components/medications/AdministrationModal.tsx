'use client';

import { useState } from 'react';
import { useRegisterAdministration } from '@/hooks/useMedications';
import type { MedicationLogStatus, MedicationScheduleItem } from '@/types/medication';

const STATUS_OPTIONS: { value: MedicationLogStatus; label: string }[] = [
  { value: 'administered', label: '✓ Administrado' },
  { value: 'refused', label: '✕ Recusado pelo residente' },
  { value: 'missed', label: '⊘ Omitido' },
  { value: 'delayed', label: '⏱ Atrasado (será administrado)' },
  { value: 'partially_administered', label: '◐ Parcialmente administrado' },
  { value: 'not_available', label: '🚫 Medicamento indisponível' },
];

interface Props {
  medication: MedicationScheduleItem;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdministrationModal({ medication, onClose, onSuccess }: Props) {
  const [status, setStatus] = useState<MedicationLogStatus>('administered');
  const [reason, setReason] = useState('');
  const [dosageActuallyGiven, setDosageActuallyGiven] = useState('');
  const [residentComplaint, setResidentComplaint] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const { mutate: registerAdministration, isPending } = useRegisterAdministration();

  const requiresReason = status !== 'administered';
  const requiresDosage = status === 'partially_administered';

  const handleSubmit = () => {
    setError('');
    if (requiresReason && !reason.trim()) {
      setError('Por favor, informe o motivo.');
      return;
    }
    if (requiresDosage && !dosageActuallyGiven.trim()) {
      setError('Informe a dosagem que foi administrada.');
      return;
    }

    const administeredAt =
      status === 'administered' || status === 'partially_administered'
        ? new Date().toISOString()
        : undefined;

    registerAdministration(
      {
        medicationId: medication.medication_id,
        data: {
          scheduledTime: medication.scheduled_time,
          status,
          administeredAt,
          dosageActuallyGiven: dosageActuallyGiven || undefined,
          reasonIfNotGiven: requiresReason ? reason : undefined,
          residentComplaint: residentComplaint || undefined,
          notes: notes || undefined,
        },
      },
      {
        onSuccess: () => {
          onSuccess();
          onClose();
        },
        onError: (err) => setError((err as Error).message),
      },
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-stone-900">Registrar Medicamento</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Resumo */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
          <div className="flex items-center gap-3">
            {medication.resident_photo && (
              <img
                src={medication.resident_photo}
                alt={medication.resident_name}
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
            <div>
              <p className="font-bold text-stone-900">{medication.resident_name}</p>
              <p className="text-sm text-stone-600">
                {medication.medication_name}
                {medication.dosage && ` — ${medication.dosage}`}
                {medication.measurement_unit && ` ${medication.measurement_unit}`}
              </p>
            </div>
          </div>
          <p className="text-sm font-semibold text-blue-700 mt-2">
            Horário: {medication.scheduled_time}
            {medication.is_overdue && (
              <span className="ml-2 text-red-600">
                (ATRASADO {Math.abs(medication.minutes_until)}min)
              </span>
            )}
          </p>
          {medication.special_instructions && (
            <p className="text-sm text-orange-700 mt-1">
              ⚠️ {medication.special_instructions}
            </p>
          )}
          {medication.interaction_warnings && (
            <p className="text-sm text-red-700 mt-1">
              ⚠️ Interação: {medication.interaction_warnings}
            </p>
          )}
        </div>

        {/* Status */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-stone-700 mb-1">
            Status *
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as MedicationLogStatus)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Dosagem parcial */}
        {requiresDosage && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-stone-700 mb-1">
              Dosagem administrada *
            </label>
            <input
              type="text"
              value={dosageActuallyGiven}
              onChange={(e) => setDosageActuallyGiven(e.target.value)}
              placeholder="Ex: metade do comprimido"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Motivo */}
        {requiresReason && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-stone-700 mb-1">
              Motivo *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Residente recusou, estava dormindo, sem estoque..."
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
        )}

        {/* Queixa do residente */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-stone-700 mb-1">
            Queixa do residente (opcional)
          </label>
          <input
            type="text"
            value={residentComplaint}
            onChange={(e) => setResidentComplaint(e.target.value)}
            placeholder="Ex: Tontura, náusea..."
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Notas */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-stone-700 mb-1">
            Observações (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Tomou com bastante água, reagiu bem..."
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 p-2 rounded-lg">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-stone-100 text-stone-700 rounded-lg font-semibold hover:bg-stone-200 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {isPending ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
