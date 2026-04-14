'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SchedulesAPI } from '@/lib/api/schedules';
import type { CreateScheduleEntry } from '@/types/schedule';

export const scheduleKeys = {
  all:     ['schedules'] as const,
  month:   (month: string) => ['schedules', month] as const,
  byUser:  (userId: string, month?: string) => ['schedules', 'user', userId, month] as const,
};

export function useSchedules(month?: string) {
  return useQuery({
    queryKey: scheduleKeys.month(month ?? 'all'),
    queryFn:  () => SchedulesAPI.list(month),
  });
}

export function useUserSchedules(userId: string, month?: string) {
  return useQuery({
    queryKey: scheduleKeys.byUser(userId, month),
    queryFn:  () => SchedulesAPI.getByUser(userId, month),
    enabled:  !!userId,
  });
}

export function useCreateSchedules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { schedules: CreateScheduleEntry[]; month?: string }) =>
      SchedulesAPI.create(payload),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: scheduleKeys.all }); },
  });
}

export function useConfirmSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirmed, notes }: { id: string; confirmed: boolean; notes?: string }) =>
      SchedulesAPI.confirm(id, confirmed, notes),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: scheduleKeys.all }); },
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => SchedulesAPI.checkIn(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: scheduleKeys.all }); },
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => SchedulesAPI.checkOut(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: scheduleKeys.all }); },
  });
}

export function useRegisterAbsence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; reason: string; approved?: boolean; notes?: string }) =>
      SchedulesAPI.registerAbsence(id, payload),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: scheduleKeys.all }); },
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => SchedulesAPI.remove(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: scheduleKeys.all }); },
  });
}
