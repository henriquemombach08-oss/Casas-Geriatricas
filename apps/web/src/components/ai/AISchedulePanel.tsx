'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAnalyzeSchedule,
  useSuggestSchedule,
  aiScheduleKeys,
} from '@/hooks/useAISchedule';
import { useCreateSchedules } from '@/hooks/useSchedules';
import type { ConflictSeverity, SuggestedAssignment } from '@/lib/api/ai';
import toast from 'react-hot-toast';

interface Props {
  month: string;
}

const SEVERITY_LABELS: Record<ConflictSeverity, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

const SEVERITY_BADGE: Record<ConflictSeverity, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

const SHIFT_LABELS: Record<string, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  night: 'Noite',
  full_day: 'Dia Inteiro',
  on_call: 'Sobreaviso',
};

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color =
    pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 w-full overflow-hidden">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function RiskBar({ value }: { value: number }) {
  const color =
    value <= 30 ? 'bg-green-500' : value <= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 w-full overflow-hidden">
      <div
        className={`h-1.5 rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

export default function AISchedulePanel({ month }: Props) {
  const qc = useQueryClient();
  const [activeSuggestion, setActiveSuggestion] = useState<
    import('@/lib/api/ai').ScheduleSuggestion | null
  >(null);

  const { data: analysis, isFetching: analyzing, refetch: runAnalysis } = useAnalyzeSchedule(month);
  const { mutate: suggestSchedule, isPending: suggesting } = useSuggestSchedule();
  const { mutate: applySchedules, isPending: applying } = useCreateSchedules();

  const handleAnalyze = async () => {
    await runAnalysis();
  };

  const handleSuggest = () => {
    suggestSchedule(month, {
      onSuccess: (data) => {
        setActiveSuggestion(data);
        void qc.invalidateQueries({ queryKey: aiScheduleKeys.suggestions(month) });
      },
    });
  };

  const handleApply = () => {
    if (!activeSuggestion) return;
    const entries = activeSuggestion.assignments.map((a: SuggestedAssignment) => ({
      user_id: a.userId,
      schedule_date: a.date,
      shift: a.shift as import('@/types/schedule').WorkShift,
    }));
    applySchedules(
      { schedules: entries, month },
      {
        onSuccess: () => {
          toast.success('Sugestão aplicada à escala!');
          setActiveSuggestion(null);
        },
        onError: () => {
          toast.error('Erro ao aplicar sugestão');
        },
      },
    );
  };

  return (
    <div className="card space-y-6">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Análise de IA — Escala
          </h2>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="btn-primary text-sm"
        >
          {analyzing ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Analisando...
            </span>
          ) : (
            'Analisar com IA'
          )}
        </button>
      </div>

      {/* Analysis results */}
      {analysis && (
        <>
          {/* Conflicts */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Conflitos Detectados ({analysis.conflicts.length})
            </h3>
            {analysis.conflicts.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Nenhum conflito encontrado para este mês.
              </p>
            ) : (
              <div className="space-y-2">
                {analysis.conflicts.map((conflict) => (
                  <div
                    key={conflict.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                  >
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${SEVERITY_BADGE[conflict.severity]}`}
                    >
                      {SEVERITY_LABELS[conflict.severity]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {conflict.staffName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {conflict.date} · {SHIFT_LABELS[conflict.shift] ?? conflict.shift}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                        {conflict.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Absence risks */}
          {analysis.absenceRisks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Risco de Falta por Funcionário
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                      <th className="pb-2 pr-4 font-medium">Funcionário</th>
                      <th className="pb-2 pr-4 font-medium">Risco</th>
                      <th className="pb-2 font-medium">Indicadores</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {analysis.absenceRisks.map((risk) => (
                      <tr key={risk.userId}>
                        <td className="py-2 pr-4 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                          {risk.staffName}
                        </td>
                        <td className="py-2 pr-4 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <RiskBar value={risk.riskPercentage} />
                            <span
                              className={`text-xs font-semibold shrink-0 ${
                                risk.riskPercentage > 60
                                  ? 'text-red-600 dark:text-red-400'
                                  : risk.riskPercentage > 30
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : 'text-green-600 dark:text-green-400'
                              }`}
                            >
                              {risk.riskPercentage}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {risk.factors.join(', ')}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Recomendações
              </h3>
              <ul className="space-y-1">
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Divider */}
          <hr className="border-gray-200 dark:border-gray-700" />
        </>
      )}

      {/* Suggest schedule */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Sugestão de Escala por IA
          </h3>
          <button
            onClick={handleSuggest}
            disabled={suggesting}
            className="btn-secondary text-sm"
          >
            {suggesting ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-3.5 w-3.5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                Gerando...
              </span>
            ) : (
              'Gerar Sugestão'
            )}
          </button>
        </div>

        {activeSuggestion && (
          <div className="space-y-4">
            {/* Score summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                  Cobertura
                </p>
                <div className="flex items-center gap-2">
                  <ScoreBar value={activeSuggestion.coverageRate} />
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300 shrink-0">
                    {activeSuggestion.coverageRate}%
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3">
                <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                  Pontuação
                </p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {activeSuggestion.score}
                  <span className="text-xs font-normal text-green-500 ml-1">/100</span>
                </p>
              </div>
            </div>

            {/* Assignments table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                    <th className="px-3 py-2 font-medium">Data</th>
                    <th className="px-3 py-2 font-medium">Turno</th>
                    <th className="px-3 py-2 font-medium">Funcionário</th>
                    <th className="px-3 py-2 font-medium text-right">Confiança</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {activeSuggestion.assignments.map((a, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {a.date}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                        {SHIFT_LABELS[a.shift] ?? a.shift}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">
                        {a.staffName}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={`text-xs font-semibold ${
                            a.confidencePercentage >= 70
                              ? 'text-green-600 dark:text-green-400'
                              : a.confidencePercentage >= 40
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {a.confidencePercentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Apply button */}
            <div className="flex justify-end">
              <button
                onClick={handleApply}
                disabled={applying}
                className="btn-primary text-sm"
              >
                {applying ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Aplicando...
                  </span>
                ) : (
                  'Aplicar Sugestão'
                )}
              </button>
            </div>
          </div>
        )}

        {!activeSuggestion && !suggesting && (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Clique em &quot;Gerar Sugestão&quot; para que a IA proponha uma escala otimizada para o mês.
          </p>
        )}
      </div>
    </div>
  );
}
