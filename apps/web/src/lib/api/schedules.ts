import axios from 'axios';
import type { SchedulesResponse, WorkSchedule, CreateScheduleEntry } from '@/types/schedule';

const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const SchedulesAPI = {
  list: async (month?: string): Promise<SchedulesResponse> => {
    const params = month ? { month } : {};
    const { data } = await api.get<{ success: boolean; data: SchedulesResponse }>('/schedules', { params });
    return data.data;
  },

  getByUser: async (userId: string, month?: string): Promise<WorkSchedule[]> => {
    const params = month ? { month } : {};
    const { data } = await api.get<{ success: boolean; data: WorkSchedule[] }>(`/schedules/${userId}/schedules`, { params });
    return data.data;
  },

  create: async (payload: { schedules: CreateScheduleEntry[]; month?: string }): Promise<{ created_count: number; errors: string[] }> => {
    const { data } = await api.post<{ success: boolean; data: { created_count: number; errors: string[] } }>('/schedules', payload);
    return data.data;
  },

  confirm: async (id: string, confirmed: boolean, notes?: string): Promise<WorkSchedule> => {
    const { data } = await api.put<{ success: boolean; data: WorkSchedule }>(`/schedules/${id}/confirm`, { confirmed, notes });
    return data.data;
  },

  checkIn: async (id: string): Promise<{ checked_in_at: string; is_late: boolean }> => {
    const { data } = await api.post<{ success: boolean; data: { checked_in_at: string; is_late: boolean } }>(`/schedules/${id}/check-in`);
    return data.data;
  },

  checkOut: async (id: string): Promise<{ checked_out_at: string; worked_hours: number }> => {
    const { data } = await api.post<{ success: boolean; data: { checked_out_at: string; worked_hours: number } }>(`/schedules/${id}/check-out`);
    return data.data;
  },

  registerAbsence: async (id: string, payload: { reason: string; approved?: boolean; notes?: string }): Promise<WorkSchedule> => {
    const { data } = await api.put<{ success: boolean; data: WorkSchedule }>(`/schedules/${id}/absence`, payload);
    return data.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/schedules/${id}`);
  },
};
