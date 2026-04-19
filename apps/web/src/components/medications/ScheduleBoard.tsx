'use client';

import { useState } from 'react';
import AdministrationModal from './AdministrationModal';
import type { MedicationScheduleItem } from '@/types/medication';

interface Props {
  medications: MedicationScheduleItem[];
  onAdministered: () => void;
}

function getCardColor(minutes: number, isOverdue: boolean): string {
  if (isOverdue) return 'bg-red-50 border-red-400';
  if (minutes <= 5) return 'bg-orange-50 border-orange-400';
  if (minutes <= 15) return 'bg-yellow-50 border-yellow-400';
  return 'bg-green-50 border-green-400';
}

function getBadgeColor(minutes: number, isOverdue: boolean): string {
  if (isOverdue) return 'bg-red-600 text-white';
  if (minutes <= 5) return 'bg-orange-500 text-white';
  if (minutes <= 15) return 'bg-yellow-500 text-white';
  return 'bg-green-600 text-white';
}

function formatTimeLabel(minutes: number, isOverdue: boolean): string {
  if (isOverdue) return `Atrasado ${Math.abs(minutes)}min`;
  if (minutes === 0) return 'Agora';
  return `${minutes}min`;
}

interface CardProps {
  med: MedicationScheduleItem;
  onAdminister: () => void;
}

function MedicationCard({ med, onAdminister }: CardProps) {
  return (
    <div
      className={`border-2 rounded-xl p-4 flex flex-col gap-3 ${getCardColor(
        med.minutes_until,
        med.is_overdue,
      )}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          {med.resident_photo ? (
            <img
              src={med.resident_photo}
              alt={med.resident_name}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0">
              <span className="text-stone-500 text-lg font-bold">
                {med.resident_name.charAt(0)}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-stone-900 truncate">{med.resident_name}</p>
            <p className="text-sm text-stone-600 truncate">{med.medication_name}</p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${getBadgeColor(
            med.minutes_until,
            med.is_overdue,
          )}`}
        >
          {formatTimeLabel(med.minutes_until, med.is_overdue)}
        </span>
      </div>

      <div className="space-y-1 text-sm">
        {med.dosage && (
          <p>
            <span className="font-semibold">Dose:</span> {med.dosage}
            {med.measurement_unit && ` ${med.measurement_unit}`}
          </p>
        )}
        <p>
          <span className="font-semibold">Horário:</span> {med.scheduled_time}
        </p>
        {med.special_instructions && (
          <p className="text-orange-700 font-medium">
            ⚠️ {med.special_instructions}
          </p>
        )}
        {med.interaction_warnings && (
          <p className="text-red-700 font-medium text-xs">
            ⚠️ Interação: {med.interaction_warnings}
          </p>
        )}
        {med.instructions_for_caregiver && (
          <p className="text-blue-700 text-xs">
            💊 {med.instructions_for_caregiver}
          </p>
        )}
      </div>

      <button
        onClick={onAdminister}
        className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 active:scale-95 transition"
      >
        Registrar administração
      </button>
    </div>
  );
}

export default function ScheduleBoard({ medications, onAdministered }: Props) {
  const [selectedMed, setSelectedMed] = useState<MedicationScheduleItem | null>(null);

  const overdue = medications.filter((m) => m.is_overdue);
  const upcoming = medications.filter((m) => !m.is_overdue);

  return (
    <div className="space-y-8">
      {overdue.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-600 text-white text-sm font-bold">
              {overdue.length}
            </span>
            Medicamento{overdue.length !== 1 ? 's' : ''} ATRASADO{overdue.length !== 1 ? 'S' : ''}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overdue.map((med) => (
              <MedicationCard
                key={med.id}
                med={med}
                onAdminister={() => setSelectedMed(med)}
              />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-stone-800 mb-4">
            Próximos a administrar
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((med) => (
              <MedicationCard
                key={med.id}
                med={med}
                onAdminister={() => setSelectedMed(med)}
              />
            ))}
          </div>
        </section>
      )}

      {selectedMed && (
        <AdministrationModal
          medication={selectedMed}
          onClose={() => setSelectedMed(null)}
          onSuccess={() => {
            setSelectedMed(null);
            onAdministered();
          }}
        />
      )}
    </div>
  );
}
