'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CarePlansAPI } from '@/lib/api/carePlans';
import type { CreateCarePlanInput, UpdateCarePlanInput } from '@/lib/api/carePlans';
import toast from 'react-hot-toast';

export const carePlanKeys = {
  all: ['care-plans'] as const,
  byResident: (residentId: string) => ['care-plans', residentId] as const,
};

export function useCarePlans(residentId: string) {
  return useQuery({
    queryKey: carePlanKeys.byResident(residentId),
    queryFn: () => CarePlansAPI.list(residentId),
    enabled: !!residentId,
  });
}

export function useAutoGenerateCarePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (residentId: string) => CarePlansAPI.autoGenerate(residentId),
    onSuccess: (_data, residentId) => {
      void qc.invalidateQueries({ queryKey: carePlanKeys.byResident(residentId) });
      toast.success('Plano de cuidados gerado pela IA com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao gerar plano de cuidados com IA');
    },
  });
}

export function useCreateCarePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCarePlanInput) => CarePlansAPI.create(input),
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: carePlanKeys.byResident(input.residentId) });
      toast.success('Plano de cuidados criado!');
    },
    onError: () => {
      toast.error('Erro ao criar plano de cuidados');
    },
  });
}

export function useUpdateCarePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCarePlanInput; residentId: string }) =>
      CarePlansAPI.update(id, input),
    onSuccess: (_data, { residentId }) => {
      void qc.invalidateQueries({ queryKey: carePlanKeys.byResident(residentId) });
      toast.success('Plano de cuidados atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar plano de cuidados');
    },
  });
}

export function useDeleteCarePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; residentId: string }) => CarePlansAPI.remove(id),
    onSuccess: (_data, { residentId }) => {
      void qc.invalidateQueries({ queryKey: carePlanKeys.byResident(residentId) });
      toast.success('Plano de cuidados removido');
    },
    onError: () => {
      toast.error('Erro ao remover plano de cuidados');
    },
  });
}

export function useUpdateCarePlanTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      completed,
      notes,
    }: {
      taskId: string;
      completed: boolean;
      notes?: string;
      residentId: string;
    }) => CarePlansAPI.updateTask(taskId, { completed, notes }),
    onSuccess: (_data, { residentId }) => {
      void qc.invalidateQueries({ queryKey: carePlanKeys.byResident(residentId) });
    },
    onError: () => {
      toast.error('Erro ao atualizar tarefa');
    },
  });
}
