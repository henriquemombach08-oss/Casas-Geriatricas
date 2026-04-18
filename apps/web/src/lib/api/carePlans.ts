import axios from 'axios';

const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type CarePlanStatus = 'active' | 'completed' | 'archived';
export type TaskCategory =
  | 'medication'
  | 'monitoring'
  | 'mobility'
  | 'nutrition'
  | 'hygiene'
  | 'therapy'
  | 'other';

export interface CarePlanTask {
  id: string;
  title: string;
  category: TaskCategory;
  frequency: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface CarePlan {
  id: string;
  residentId: string;
  title: string;
  status: CarePlanStatus;
  diagnoses: string[];
  reviewDate?: string;
  tasks: CarePlanTask[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCarePlanInput {
  residentId: string;
  title: string;
  diagnoses?: string[];
  reviewDate?: string;
  tasks?: Omit<CarePlanTask, 'id' | 'completed' | 'completedAt'>[];
}

export interface UpdateCarePlanInput {
  title?: string;
  status?: CarePlanStatus;
  diagnoses?: string[];
  reviewDate?: string;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const CarePlansAPI = {
  list: async (residentId: string): Promise<CarePlan[]> => {
    const { data } = await api.get<{ success: boolean; data: CarePlan[] }>('/care-plans', {
      params: { residentId },
    });
    return data.data;
  },

  autoGenerate: async (residentId: string): Promise<CarePlan> => {
    const { data } = await api.post<{ success: boolean; data: CarePlan }>(
      '/care-plans/auto-generate',
      { residentId },
    );
    return data.data;
  },

  create: async (input: CreateCarePlanInput): Promise<CarePlan> => {
    const { data } = await api.post<{ success: boolean; data: CarePlan }>('/care-plans', input);
    return data.data;
  },

  update: async (id: string, input: UpdateCarePlanInput): Promise<CarePlan> => {
    const { data } = await api.put<{ success: boolean; data: CarePlan }>(
      `/care-plans/${id}`,
      input,
    );
    return data.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/care-plans/${id}`);
  },

  updateTask: async (
    taskId: string,
    input: { completed: boolean; notes?: string },
  ): Promise<CarePlanTask> => {
    const { data } = await api.put<{ success: boolean; data: CarePlanTask }>(
      `/care-plans/tasks/${taskId}`,
      input,
    );
    return data.data;
  },
};
