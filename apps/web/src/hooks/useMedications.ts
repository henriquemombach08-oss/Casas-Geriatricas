import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MedicationsAPI } from '@/lib/api/medications';
import type {
  CreateMedicationInput,
  UpdateMedicationInput,
  RegisterLogInput,
} from '@/types/medication';

// ─── Keys ─────────────────────────────────────────────────────────────────

export const medicationKeys = {
  all: ['medications'] as const,
  byResident: (residentId: string, status?: string) =>
    [...medicationKeys.all, 'resident', residentId, status] as const,
  schedule: (minutes?: number) =>
    [...medicationKeys.all, 'schedule', minutes] as const,
  history: (id: string, days?: number) =>
    [...medicationKeys.all, 'history', id, days] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────

export function useMedicationsByResident(
  residentId: string,
  status?: 'active' | 'inactive',
) {
  return useQuery({
    queryKey: medicationKeys.byResident(residentId, status),
    queryFn: () => MedicationsAPI.listByResident(residentId, status),
    enabled: !!residentId,
  });
}

export function useMedicationSchedule(upcomingMinutes = 60) {
  return useQuery({
    queryKey: medicationKeys.schedule(upcomingMinutes),
    queryFn: () => MedicationsAPI.getScheduledNext({ upcoming_in_minutes: upcomingMinutes }),
    refetchInterval: 30_000, // auto-refresh every 30 seconds
    staleTime: 0,
  });
}

export function useMedicationHistory(medicationId: string, days = 30) {
  return useQuery({
    queryKey: medicationKeys.history(medicationId, days),
    queryFn: () => MedicationsAPI.getHistory(medicationId, days),
    enabled: !!medicationId,
  });
}

export function useCreateMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMedicationInput) => MedicationsAPI.create(data),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({
        queryKey: medicationKeys.byResident(vars.residentId),
      });
    },
  });
}

export function useUpdateMedication(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateMedicationInput) => MedicationsAPI.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: medicationKeys.all });
    },
  });
}

export function useDiscontinueMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      MedicationsAPI.discontinue(id, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: medicationKeys.all });
    },
  });
}

export function useRegisterAdministration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      medicationId,
      data,
    }: {
      medicationId: string;
      data: RegisterLogInput;
    }) => MedicationsAPI.registerLog(medicationId, data),
    onSuccess: () => {
      // Invalidate schedule so dashboard updates immediately
      void qc.invalidateQueries({ queryKey: medicationKeys.all });
    },
  });
}
