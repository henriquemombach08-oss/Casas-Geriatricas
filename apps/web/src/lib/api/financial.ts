import axios from 'axios';
import type {
  FinancialRecord,
  FinancialSummary,
  ResidentFinancialHistory,
  CreateFinancialInput,
} from '@/types/financial';

const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const FinancialAPI = {
  listByResident: async (residentId: string, months = 3, status = 'all'): Promise<ResidentFinancialHistory> => {
    const { data } = await api.get<{ success: boolean; data: ResidentFinancialHistory }>(
      `/financial/resident/${residentId}`,
      { params: { months, status } },
    );
    return data.data;
  },

  getSummary: async (): Promise<FinancialSummary> => {
    const { data } = await api.get<{ success: boolean; data: FinancialSummary }>('/financial/summary');
    return data.data;
  },

  create: async (payload: CreateFinancialInput): Promise<FinancialRecord> => {
    const { data } = await api.post<{ success: boolean; data: FinancialRecord }>('/financial', payload);
    return data.data;
  },

  update: async (id: string, payload: Partial<CreateFinancialInput & { status: string }>): Promise<FinancialRecord> => {
    const { data } = await api.put<{ success: boolean; data: FinancialRecord }>(`/financial/${id}`, payload);
    return data.data;
  },

  cancel: async (id: string): Promise<void> => {
    await api.delete(`/financial/${id}`);
  },

  generateNfe: async (id: string): Promise<{ nfe_number: string; nfe_issued_at: string }> => {
    const { data } = await api.post<{ success: boolean; data: { nfe_number: string; nfe_issued_at: string } }>(
      `/financial/${id}/generate-nfe`,
    );
    return data.data;
  },

  sendReminder: async (id: string, channels?: string[]): Promise<{ message: string; channels_sent: string[] }> => {
    const { data } = await api.post<{ success: boolean; data: { message: string; channels_sent: string[] } }>(
      `/financial/${id}/send-reminder`,
      { channels },
    );
    return data.data;
  },
};
