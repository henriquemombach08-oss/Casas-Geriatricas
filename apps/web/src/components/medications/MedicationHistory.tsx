'use client';

import { useState } from 'react';
import { useMedicationHistory } from '@/hooks/useMedications';
import type { MedicationLogStatus } from '@/types/medication';

const STATUS_LABELS: Record<MedicationLogStatus, string> = {
  administered: 'Administrado',
  refused: 'Recusado',
  missed: 'Omitido',
  delayed: 'Atrasado',
  partially_administered: 'Parcial',
  not_available: 'Indisponível',
};

const STATUS_COLORS: Record<MedicationLogStatus, string> = {
  administered: 'bg-green-100 text-green-800',
  refused: 'bg-red-100 text-red-800',
  missed: 'bg-stone-100 text-stone-800',
  delayed: 'bg-yellow-100 text-yellow-800',
  partially_administered: 'bg-orange-100 text-orange-800',
  not_available: 'bg-purple-100 text-purple-800',
};

function AdherenceRing({ rate }: { rate: number }) {
  const color = rate >= 80 ? 'text-green-600' : rate >= 60 ? 'text-yellow-600' : 'text-red-600';
  return (
    <div className="flex flex-col items-center">
      <div className={`text-4xl font-bold ${color}`}>{rate}%</div>
      <div className="text-sm text-stone-500">Taxa de adesão</div>
    </div>
  );
}

interface Props {
  medicationId: string;
}

export default function MedicationHistory({ medicationId }: Props) {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useMedicationHistory(medicationId, days);

  if (isLoading) {
    return <div className="text-center py-8 text-stone-500">Carregando histórico...</div>;
  }

  if (!data) return null;

  const { logs, stats } = data;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4 flex flex-col items-center">
          <AdherenceRing rate={stats.adherence_rate} />
        </div>
        <div className="bg-white border rounded-xl p-4 flex flex-col items-center">
          <div className="text-3xl font-bold text-stone-900">{stats.total_logs}</div>
          <div className="text-sm text-stone-500">Registros</div>
        </div>
        <div className="bg-white border rounded-xl p-4 flex flex-col items-center">
          <div className="text-3xl font-bold text-green-600">
            {stats.status_counts.administered ?? 0}
          </div>
          <div className="text-sm text-stone-500">Administrados</div>
        </div>
        <div className="bg-white border rounded-xl p-4 flex flex-col items-center">
          <div className="text-3xl font-bold text-red-600">
            {(stats.status_counts.refused ?? 0) + (stats.status_counts.missed ?? 0)}
          </div>
          <div className="text-sm text-stone-500">Não administrados</div>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex gap-2">
        {[7, 14, 30, 60, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              days === d
                ? 'bg-blue-600 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {d} dias
          </button>
        ))}
      </div>

      {/* Logs */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-stone-50">
          <h3 className="font-semibold text-stone-700">Histórico de administrações</h3>
        </div>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-stone-500">
            Nenhum registro nos últimos {days} dias
          </div>
        ) : (
          <ul className="divide-y">
            {logs.map((log) => (
              <li key={log.id} className="px-4 py-3 flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[log.status]}`}
                    >
                      {STATUS_LABELS[log.status]}
                    </span>
                    {log.scheduledTime && (
                      <span className="text-xs text-stone-500">
                        Horário: {log.scheduledTime}
                      </span>
                    )}
                    {log.administeredAt && (
                      <span className="text-xs text-stone-500">
                        Administrado às {new Date(log.administeredAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  {log.dosageActuallyGiven && (
                    <p className="text-xs text-stone-600 mt-1">
                      Dose: {log.dosageActuallyGiven}
                    </p>
                  )}
                  {log.reasonIfNotGiven && (
                    <p className="text-xs text-stone-600 mt-1">
                      Motivo: {log.reasonIfNotGiven}
                    </p>
                  )}
                  {log.residentComplaint && (
                    <p className="text-xs text-orange-600 mt-1">
                      Queixa: {log.residentComplaint}
                    </p>
                  )}
                  {log.notes && (
                    <p className="text-xs text-stone-500 mt-1">{log.notes}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {log.administratedBy && (
                      <span className="text-xs text-stone-400">
                        por {log.administratedBy.name}
                      </span>
                    )}
                    <span className="text-xs text-stone-400">
                      {new Date(log.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
