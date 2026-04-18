'use client';

import { useRiskScores, useRecalculateRiskScores } from '@/hooks/useAISchedule';
import { cn } from '@/lib/utils';

function riskColor(score: number) {
  if (score >= 60) return 'text-red-600 dark:text-red-400';
  if (score >= 30) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

function riskBg(score: number) {
  if (score >= 60) return 'bg-red-500';
  if (score >= 30) return 'bg-yellow-500';
  return 'bg-green-500';
}

function riskLabel(score: number) {
  if (score >= 60) return 'Alto';
  if (score >= 30) return 'Médio';
  return 'Baixo';
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className={cn('font-semibold', riskColor(value))}>{value}%</span>
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn('h-1.5 rounded-full transition-all', riskBg(value))}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

interface Props {
  residentId: string;
}

export function RiskScoreWidget({ residentId }: Props) {
  const { data, isLoading, isError } = useRiskScores(residentId);
  const { mutate: recalculate, isPending: recalculating } = useRecalculateRiskScores(residentId);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">⚠️ Avaliação de Risco</h2>
        <button
          onClick={() => recalculate()}
          disabled={recalculating || isLoading}
          className="text-xs text-primary hover:underline disabled:opacity-50"
        >
          {recalculating ? 'Calculando...' : 'Recalcular'}
        </button>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-400 text-center py-3">Calculando riscos...</p>
      )}

      {isError && !isLoading && (
        <div className="text-center py-3">
          <p className="text-sm text-gray-500">Sem avaliação ainda.</p>
          <button
            onClick={() => recalculate()}
            className="text-xs text-primary hover:underline mt-1"
          >
            Calcular agora
          </button>
        </div>
      )}

      {data && !isLoading && (
        <div className="space-y-3">
          {/* Overall risk */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div
              className={cn(
                'w-12 h-12 rounded-full flex flex-col items-center justify-center shrink-0',
                data.scores ? 'bg-gray-100 dark:bg-gray-700' : '',
              )}
            >
              <span className={cn('text-lg font-bold', riskColor(data.scores?.[0]?.score ?? 0))}>
                {data.scores?.[0]?.score ?? 0}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Risco Geral</p>
              <p className={cn('font-semibold text-sm', riskColor(data.scores?.[0]?.score ?? 0))}>
                {riskLabel(data.scores?.[0]?.score ?? 0)}
              </p>
            </div>
          </div>

          {/* Individual scores */}
          <div className="space-y-2.5">
            {data.scores?.map((s) => (
              <ScoreBar key={s.type} label={s.label} value={s.score} />
            ))}
          </div>

          {/* Top factors */}
          {data.scores?.[0]?.factors && data.scores[0].factors.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Principais fatores:</p>
              <ul className="space-y-1">
                {data.scores[0].factors.slice(0, 3).map((f, i) => (
                  <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex gap-1">
                    <span className="shrink-0">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-gray-400">
            Calculado em: {new Date(data.calculatedAt).toLocaleDateString('pt-BR')}
          </p>
        </div>
      )}
    </div>
  );
}
