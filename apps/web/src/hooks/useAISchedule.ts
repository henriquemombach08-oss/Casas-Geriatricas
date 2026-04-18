'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AIAPI } from '@/lib/api/ai';
import toast from 'react-hot-toast';

export const aiScheduleKeys = {
  all: ['ai', 'schedule'] as const,
  analysis: (month: string) => ['ai', 'schedule', 'analysis', month] as const,
  suggestions: (month: string) => ['ai', 'schedule', 'suggestions', month] as const,
};

export function useAnalyzeSchedule(month: string) {
  return useQuery({
    queryKey: aiScheduleKeys.analysis(month),
    queryFn: () => AIAPI.analyzeSchedule(month),
    enabled: false,
    retry: false,
  });
}

export function useSuggestSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (month: string) => AIAPI.suggestSchedule(month),
    onSuccess: (_data, month) => {
      void qc.invalidateQueries({ queryKey: aiScheduleKeys.suggestions(month) });
      toast.success('Sugestão de escala gerada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao gerar sugestão de escala');
    },
  });
}

export function useScheduleSuggestions(month: string) {
  return useQuery({
    queryKey: aiScheduleKeys.suggestions(month),
    queryFn: () => AIAPI.getScheduleSuggestions(month),
    enabled: !!month,
  });
}

export function useRecalculateRiskScores(residentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => AIAPI.recalculateRiskScores(residentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ai', 'risk-scores', residentId] });
      toast.success('Pontuações de risco recalculadas!');
    },
    onError: () => {
      toast.error('Erro ao recalcular pontuações de risco');
    },
  });
}

export function useRiskScores(residentId: string) {
  return useQuery({
    queryKey: ['ai', 'risk-scores', residentId],
    queryFn: () => AIAPI.getRiskScores(residentId),
    enabled: !!residentId,
    retry: false,
  });
}
