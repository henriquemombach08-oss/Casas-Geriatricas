'use client';

import { useState } from 'react';
import { useCarePlans, useAutoGenerateCarePlan, useUpdateCarePlanTask, useDeleteCarePlan } from '@/hooks/useCarePlans';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<string, string> = {
  medication: '💊',
  monitoring: '📊',
  therapy: '🏃',
  nutrition: '🥗',
  mobility: '🚶',
  hygiene: '🚿',
  social: '👥',
  other: '📌',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  completed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  archived: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  completed: 'Concluído',
  archived: 'Arquivado',
};

interface Props {
  residentId: string;
}

export function CarePlansTab({ residentId }: Props) {
  const { data: plans, isLoading } = useCarePlans(residentId);
  const { mutate: autoGenerate, isPending: generating } = useAutoGenerateCarePlan();
  const { mutate: updateTask } = useUpdateCarePlanTask();
  const { mutate: deletePlan } = useDeleteCarePlan();
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  if (isLoading) {
    return <div className="card text-center py-8 text-gray-400">Carregando planos...</div>;
  }

  const totalPlans = plans?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Planos de Cuidados
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{totalPlans} plano(s) cadastrado(s)</p>
        </div>
        <button
          onClick={() => autoGenerate(residentId)}
          disabled={generating}
          className="btn-primary flex items-center gap-2"
        >
          {generating ? (
            <>
              <span className="animate-spin">⏳</span> Gerando...
            </>
          ) : (
            <>🤖 Gerar com IA</>
          )}
        </button>
      </div>

      {/* Empty state */}
      {totalPlans === 0 && (
        <div className="card text-center py-10">
          <p className="text-3xl mb-3">📋</p>
          <p className="font-medium text-gray-700 dark:text-gray-300">Nenhum plano de cuidados</p>
          <p className="text-sm text-gray-500 mt-1">
            Clique em &quot;Gerar com IA&quot; para criar automaticamente baseado nos diagnósticos do residente.
          </p>
        </div>
      )}

      {/* Plans list */}
      {plans?.map((plan) => {
        const completed = plan.tasks.filter((t: { completed: boolean }) => t.completed).length;
        const total = plan.tasks.length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        const isExpanded = expandedPlan === plan.id;

        return (
          <div key={plan.id} className="card">
            {/* Plan header */}
            <button
              className="w-full text-left"
              onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {plan.title}
                    </h3>
                    <span className={cn('badge text-xs', STATUS_COLORS[plan.status] ?? '')}>
                      {STATUS_LABELS[plan.status] ?? plan.status}
                    </span>
                  </div>

                  {/* Diagnoses */}
                  {plan.diagnoses?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {plan.diagnoses.slice(0, 4).map((d: string) => (
                        <span
                          key={d}
                          className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded px-2 py-0.5"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Progress */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>{completed}/{total} tarefas concluídas</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-1.5 rounded-full transition-all',
                          pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500',
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>
            </button>

            {/* Tasks */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                {plan.tasks.map((task: { id: string; title: string; category: string; frequency?: string; completed: boolean; description?: string }) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <button
                      onClick={() =>
                        updateTask({
                          taskId: task.id,
                          completed: !task.completed,
                          residentId,
                        })
                      }
                      className={cn(
                        'mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                        task.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 dark:border-gray-600',
                      )}
                    >
                      {task.completed && <span className="text-xs">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm',
                          task.completed
                            ? 'line-through text-gray-400'
                            : 'text-gray-700 dark:text-gray-200',
                        )}
                      >
                        {CATEGORY_ICONS[task.category] ?? '📌'} {task.title}
                      </p>
                      {task.frequency && (
                        <p className="text-xs text-gray-400 mt-0.5">{task.frequency}</p>
                      )}
                    </div>
                  </div>
                ))}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => deletePlan({ id: plan.id, residentId })}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    Remover plano
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
