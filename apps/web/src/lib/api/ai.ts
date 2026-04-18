import axios from 'axios';

const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConflictSeverity = 'high' | 'medium' | 'low';

export interface ScheduleConflict {
  id: string;
  staffName: string;
  date: string;
  shift: string;
  description: string;
  severity: ConflictSeverity;
}

export interface AbsenceRisk {
  userId: string;
  staffName: string;
  riskPercentage: number;
  factors: string[];
}

export interface ScheduleAnalysis {
  month: string;
  conflicts: ScheduleConflict[];
  absenceRisks: AbsenceRisk[];
  coverageRate: number;
  recommendations: string[];
}

export interface SuggestedAssignment {
  date: string;
  shift: string;
  userId: string;
  staffName: string;
  confidencePercentage: number;
}

export interface ScheduleSuggestion {
  id: string;
  month: string;
  score: number;
  coverageRate: number;
  assignments: SuggestedAssignment[];
  generatedAt: string;
}

export interface RiskScoreItem {
  type: 'queda' | 'infeccao' | 'desnutricao';
  label: string;
  score: number;
  factors: string[];
  recommendations: string[];
}

export interface ResidentRiskScores {
  residentId: string;
  calculatedAt: string;
  scores: RiskScoreItem[];
}

// ── API ───────────────────────────────────────────────────────────────────────

export const AIAPI = {
  analyzeSchedule: async (month: string): Promise<ScheduleAnalysis> => {
    const { data } = await api.get<{ success: boolean; data: ScheduleAnalysis }>(
      '/ai/schedule/analyze',
      { params: { month } },
    );
    return data.data;
  },

  suggestSchedule: async (month: string): Promise<ScheduleSuggestion> => {
    const { data } = await api.post<{ success: boolean; data: ScheduleSuggestion }>(
      '/ai/schedule/suggest',
      { month },
    );
    return data.data;
  },

  getScheduleSuggestions: async (month: string): Promise<ScheduleSuggestion[]> => {
    const { data } = await api.get<{ success: boolean; data: ScheduleSuggestion[] }>(
      '/ai/schedule/suggestions',
      { params: { month } },
    );
    return data.data;
  },

  getRiskScores: async (residentId: string): Promise<ResidentRiskScores> => {
    const { data } = await api.get<{ success: boolean; data: ResidentRiskScores }>(
      `/ai/risk-scores/${residentId}`,
    );
    return data.data;
  },

  recalculateRiskScores: async (residentId: string): Promise<ResidentRiskScores> => {
    const { data } = await api.post<{ success: boolean; data: ResidentRiskScores }>(
      `/ai/risk-scores/${residentId}/recalculate`,
    );
    return data.data;
  },
};
