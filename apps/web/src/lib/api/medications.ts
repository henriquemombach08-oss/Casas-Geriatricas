import { api } from '../api';
import type {
  Medication,
  MedicationHistory,
  MedicationScheduleResponse,
  CreateMedicationInput,
  UpdateMedicationInput,
  RegisterLogInput,
} from '@/types/medication';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const MedicationsAPI = {
  listByResident: async (residentId: string, status?: 'active' | 'inactive') => {
    const qs = status ? `?status=${status}` : '';
    const res = await api.get<ApiResponse<Medication[]>>(`/medications/resident/${residentId}${qs}`);
    return res.data.data;
  },

  getScheduledNext: async (params?: { upcoming_in_minutes?: number }) => {
    const qs = params?.upcoming_in_minutes ? `?upcoming_in_minutes=${params.upcoming_in_minutes}` : '';
    const res = await api.get<ApiResponse<MedicationScheduleResponse>>(`/medications/scheduled/next${qs}`);
    return res.data.data;
  },

  create: async (data: CreateMedicationInput) => {
    const res = await api.post<ApiResponse<Medication>>('/medications', data);
    return res.data.data;
  },

  update: async (id: string, data: UpdateMedicationInput) => {
    const res = await api.put<ApiResponse<Medication>>(`/medications/${id}`, data);
    return res.data.data;
  },

  discontinue: async (id: string, reason: string) => {
    const res = await api.delete<ApiResponse<{ id: string; status: string; reason_if_inactive: string }>>(
      `/medications/${id}`,
      { data: { reason } },
    );
    return res.data.data;
  },

  registerLog: async (medicationId: string, data: RegisterLogInput) => {
    const res = await api.post(`/medications/${medicationId}/logs`, data);
    return (res.data as ApiResponse<unknown>).data;
  },

  getHistory: async (medicationId: string, days = 30) => {
    const res = await api.get<ApiResponse<MedicationHistory>>(`/medications/${medicationId}/history?days=${days}`);
    return res.data.data;
  },
};
