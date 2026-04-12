import { api } from '../api';
import type {
  Resident,
  ResidentListResponse,
  ResidentFilters,
  CreateResidentInput,
  UpdateResidentInput,
} from '@/types/resident';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const ResidentsAPI = {
  list: async (filters: ResidentFilters = {}): Promise<ResidentListResponse> => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

    const res = await api.get<ApiResponse<ResidentListResponse>>(`/residents?${params}`);
    return res.data.data;
  },

  getOne: async (id: string): Promise<Resident> => {
    const res = await api.get<ApiResponse<Resident>>(`/residents/${id}`);
    return res.data.data;
  },

  create: async (input: CreateResidentInput): Promise<{ id: string; name: string }> => {
    const res = await api.post<ApiResponse<{ id: string; name: string }>>('/residents', input);
    return res.data.data;
  },

  update: async (id: string, input: UpdateResidentInput): Promise<Resident> => {
    const res = await api.put<ApiResponse<Resident>>(`/residents/${id}`, input);
    return res.data.data;
  },

  remove: async (id: string, reason?: string): Promise<void> => {
    await api.delete(`/residents/${id}`, { data: { reason } });
  },

  uploadPhoto: async (id: string, file: File): Promise<{ photoUrl: string }> => {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post<ApiResponse<{ photoUrl: string }>>(`/residents/${id}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  listDocuments: async (id: string) => {
    const res = await api.get(`/residents/${id}/documents`);
    return (res.data as ApiResponse<unknown[]>).data;
  },

  uploadDocument: async (
    id: string,
    file: File,
    meta: { type: string; name?: string; issueDate?: string; expiresAt?: string; description?: string },
  ) => {
    const form = new FormData();
    form.append('document', file);
    Object.entries(meta).forEach(([k, v]) => {
      if (v) form.append(k, v);
    });
    const res = await api.post(`/residents/${id}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return (res.data as ApiResponse<unknown>).data;
  },
};
