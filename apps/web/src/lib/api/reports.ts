import { api } from '../api';
import type {
  MedicationsDashboard,
  MedicationsAdherence,
  ResidentsDashboard,
  ResidentsOccupancy,
  FinancialDashboard,
  AccountsReceivable,
  TopDebtor,
  FinancialForecast,
  StaffDashboard,
} from '@/types/reports';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/** Trigger a browser download from a blob response. */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const ReportsAPI = {
  // ── Medications ────────────────────────────────────────────────────────────
  getMedicationsDashboard: async (month?: string): Promise<MedicationsDashboard> => {
    const q = month ? `?month=${month}` : '';
    const res = await api.get<ApiResponse<MedicationsDashboard>>(`/reports/medications/dashboard${q}`);
    return res.data.data;
  },

  getMedicationsAdherence: async (months = 6): Promise<MedicationsAdherence> => {
    const res = await api.get<ApiResponse<MedicationsAdherence>>(`/reports/medications/adherence?months=${months}`);
    return res.data.data;
  },

  generateMedicationsPDF: async (period?: string): Promise<void> => {
    const res = await api.post('/reports/medications/generate-pdf', { period }, { responseType: 'blob' });
    downloadBlob(res.data as Blob, `relatorio-medicamentos-${Date.now()}.pdf`);
  },

  exportMedicationsExcel: async (period?: string): Promise<void> => {
    const res = await api.post('/reports/medications/export-excel', { period }, { responseType: 'blob' });
    downloadBlob(res.data as Blob, `medicamentos-${Date.now()}.xlsx`);
  },

  // ── Residents ──────────────────────────────────────────────────────────────
  getResidentsDashboard: async (period?: string): Promise<ResidentsDashboard> => {
    const q = period ? `?period=${period}` : '';
    const res = await api.get<ApiResponse<ResidentsDashboard>>(`/reports/residents/dashboard${q}`);
    return res.data.data;
  },

  getResidentsOccupancy: async (months = 6): Promise<ResidentsOccupancy> => {
    const res = await api.get<ApiResponse<ResidentsOccupancy>>(`/reports/residents/occupancy?months=${months}`);
    return res.data.data;
  },

  generateResidentPDF: async (residentId: string, period?: string): Promise<void> => {
    const res = await api.post(
      `/reports/residents/${residentId}/generate-pdf`,
      { period },
      { responseType: 'blob' },
    );
    downloadBlob(res.data as Blob, `residente-${residentId}-${Date.now()}.pdf`);
  },

  // ── Financial ──────────────────────────────────────────────────────────────
  getFinancialDashboard: async (period?: string): Promise<FinancialDashboard> => {
    const q = period ? `?period=${period}` : '';
    const res = await api.get<ApiResponse<FinancialDashboard>>(`/reports/financial/dashboard${q}`);
    return res.data.data;
  },

  getAccountsReceivable: async (): Promise<AccountsReceivable> => {
    const res = await api.get<ApiResponse<AccountsReceivable>>('/reports/financial/accounts-receivable');
    return res.data.data;
  },

  getTopDebtors: async (limit = 10): Promise<TopDebtor[]> => {
    const res = await api.get<ApiResponse<TopDebtor[]>>(`/reports/financial/top-debtors?limit=${limit}`);
    return res.data.data;
  },

  getFinancialForecast: async (): Promise<FinancialForecast> => {
    const res = await api.get<ApiResponse<FinancialForecast>>('/reports/financial/forecast');
    return res.data.data;
  },

  generateFinancialConsolidated: async (period?: string, format: 'pdf' | 'xlsx' = 'pdf'): Promise<void> => {
    const res = await api.post(
      '/reports/financial/generate-consolidated',
      { period, format },
      { responseType: 'blob' },
    );
    const ext = format === 'pdf' ? 'pdf' : 'xlsx';
    downloadBlob(res.data as Blob, `financeiro-consolidado-${Date.now()}.${ext}`);
  },

  // ── Staff ──────────────────────────────────────────────────────────────────
  getStaffDashboard: async (period?: string): Promise<StaffDashboard> => {
    const q = period ? `?period=${period}` : '';
    const res = await api.get<ApiResponse<StaffDashboard>>(`/reports/staff/dashboard${q}`);
    return res.data.data;
  },

  generateStaffTimesheet: async (period?: string, format: 'pdf' | 'xlsx' = 'pdf'): Promise<void> => {
    const res = await api.post(
      '/reports/staff/timesheet/generate',
      { period, format },
      { responseType: 'blob' },
    );
    const ext = format === 'pdf' ? 'pdf' : 'xlsx';
    downloadBlob(res.data as Blob, `ponto-${Date.now()}.${ext}`);
  },

  exportStaffExcel: async (period?: string): Promise<void> => {
    const res = await api.post('/reports/staff/export-excel', { period }, { responseType: 'blob' });
    downloadBlob(res.data as Blob, `pessoal-${Date.now()}.xlsx`);
  },
};
