'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FinancialAPI } from '@/lib/api/financial';
import type { CreateFinancialInput } from '@/types/financial';

export const financialKeys = {
  all:        ['financial'] as const,
  summary:    ['financial', 'summary'] as const,
  resident:   (id: string, months?: number, status?: string) => ['financial', 'resident', id, months, status] as const,
};

export function useFinancialSummary() {
  return useQuery({
    queryKey: financialKeys.summary,
    queryFn:  FinancialAPI.getSummary,
    refetchInterval: 60_000,
  });
}

export function useResidentFinancial(residentId: string, months = 3, status = 'all') {
  return useQuery({
    queryKey: financialKeys.resident(residentId, months, status),
    queryFn:  () => FinancialAPI.listByResident(residentId, months, status),
    enabled:  !!residentId,
  });
}

export function useCreateFinancial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFinancialInput) => FinancialAPI.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: financialKeys.all });
    },
  });
}

export function useUpdateFinancial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<CreateFinancialInput & { status: string }>) =>
      FinancialAPI.update(id, payload),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: financialKeys.all }); },
  });
}

export function useCancelFinancial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => FinancialAPI.cancel(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: financialKeys.all }); },
  });
}

export function useGenerateNfe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => FinancialAPI.generateNfe(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: financialKeys.all }); },
  });
}

export function useSendReminder() {
  return useMutation({
    mutationFn: ({ id, channels }: { id: string; channels?: string[] }) =>
      FinancialAPI.sendReminder(id, channels),
  });
}
