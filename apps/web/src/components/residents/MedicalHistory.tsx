'use client';

import { useState } from 'react';
import type { MedicalHistory as MedicalHistoryType } from '@/types/resident';
import { formatDate } from '@/lib/utils';
import { SEVERITY_LABELS, CONDITION_STATUS_LABELS } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface Props {
  medicalHistory?: MedicalHistoryType | null;
}

const severityColors: Record<string, string> = {
  mild: 'badge-green',
  moderate: 'badge-yellow',
  severe: 'badge-red',
};

const conditionColors: Record<string, string> = {
  active: 'badge-red',
  controlled: 'badge-yellow',
  resolved: 'badge-green',
};

export function MedicalHistory({ medicalHistory }: Props) {
  const [tab, setTab] = useState<'allergies' | 'conditions' | 'surgeries' | 'checkup'>('allergies');

  const tabs = [
    { key: 'allergies' as const, label: 'Alergias', count: medicalHistory?.allergies?.length ?? 0, icon: '⚠️' },
    { key: 'conditions' as const, label: 'Condições', count: medicalHistory?.conditions?.length ?? 0, icon: '🫀' },
    { key: 'surgeries' as const, label: 'Cirurgias', count: medicalHistory?.surgeries?.length ?? 0, icon: '🏥' },
    { key: 'checkup' as const, label: 'Última Consulta', count: medicalHistory?.lastCheckup ? 1 : 0, icon: '📋' },
  ];

  return (
    <div className="card">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
        Histórico Médico
      </h2>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {t.icon} {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 badge badge-blue">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Allergies */}
      {tab === 'allergies' && (
        <div className="space-y-2">
          {!medicalHistory?.allergies?.length ? (
            <p className="text-sm text-gray-400">Nenhuma alergia registrada</p>
          ) : (
            medicalHistory.allergies.map((a, i) => (
              <div key={a.id ?? i} className="flex items-start gap-3 p-3 border rounded-lg">
                <span className="text-xl">⚠️</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{a.allergen}</p>
                    <span className={cn('badge', severityColors[a.severity] ?? 'badge-gray')}>
                      {SEVERITY_LABELS[a.severity] ?? a.severity}
                    </span>
                  </div>
                  {a.reaction && (
                    <p className="text-xs text-gray-500 mt-1">Reação: {a.reaction}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Conditions */}
      {tab === 'conditions' && (
        <div className="space-y-2">
          {!medicalHistory?.conditions?.length ? (
            <p className="text-sm text-gray-400">Nenhuma condição registrada</p>
          ) : (
            medicalHistory.conditions.map((c, i) => (
              <div key={c.id ?? i} className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm">{c.name}</p>
                  <span className={cn('badge', conditionColors[c.status] ?? 'badge-gray')}>
                    {CONDITION_STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </div>
                {c.diagnosedDate && (
                  <p className="text-xs text-gray-500">
                    Diagnosticado em: {formatDate(c.diagnosedDate)}
                  </p>
                )}
                {c.treatment && (
                  <p className="text-xs text-gray-600 mt-1">Tratamento: {c.treatment}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Surgeries */}
      {tab === 'surgeries' && (
        <div className="space-y-2">
          {!medicalHistory?.surgeries?.length ? (
            <p className="text-sm text-gray-400">Nenhuma cirurgia registrada</p>
          ) : (
            medicalHistory.surgeries.map((s, i) => (
              <div key={s.id ?? i} className="p-3 border rounded-lg">
                <p className="font-medium text-sm">{s.name}</p>
                {s.date && (
                  <p className="text-xs text-gray-500 mt-1">Data: {formatDate(s.date)}</p>
                )}
                {s.hospital && (
                  <p className="text-xs text-gray-500">Hospital: {s.hospital}</p>
                )}
                {s.surgeon && (
                  <p className="text-xs text-gray-500">Cirurgião: {s.surgeon}</p>
                )}
                {s.complications && (
                  <p className="text-xs text-gray-600 mt-1">Complicações: {s.complications}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Last Checkup */}
      {tab === 'checkup' && (
        <div>
          {!medicalHistory?.lastCheckup ? (
            <p className="text-sm text-gray-400">Nenhuma consulta registrada</p>
          ) : (
            <div className="p-3 border rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Data</p>
                  <p className="font-medium">{formatDate(medicalHistory.lastCheckup.date)}</p>
                </div>
                {medicalHistory.lastCheckup.doctor && (
                  <div>
                    <p className="text-gray-500 text-xs">Médico</p>
                    <p className="font-medium">{medicalHistory.lastCheckup.doctor}</p>
                  </div>
                )}
                {medicalHistory.lastCheckup.clinic && (
                  <div>
                    <p className="text-gray-500 text-xs">Clínica</p>
                    <p className="font-medium">{medicalHistory.lastCheckup.clinic}</p>
                  </div>
                )}
              </div>
              {medicalHistory.lastCheckup.findings && (
                <div>
                  <p className="text-gray-500 text-xs mb-1">Achados</p>
                  <p className="text-sm">{medicalHistory.lastCheckup.findings}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
