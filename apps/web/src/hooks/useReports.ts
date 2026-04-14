import { useQuery, useMutation } from '@tanstack/react-query';
import { ReportsAPI } from '@/lib/api/reports';

// ── Medications ────────────────────────────────────────────────────────────

export function useMedicationsDashboard(month?: string) {
  return useQuery({
    queryKey: ['reports', 'medications', 'dashboard', month],
    queryFn: () => ReportsAPI.getMedicationsDashboard(month),
  });
}

export function useMedicationsAdherence(months = 6) {
  return useQuery({
    queryKey: ['reports', 'medications', 'adherence', months],
    queryFn: () => ReportsAPI.getMedicationsAdherence(months),
  });
}

export function useGenerateMedicationsPDF() {
  return useMutation({ mutationFn: (period?: string) => ReportsAPI.generateMedicationsPDF(period) });
}

export function useExportMedicationsExcel() {
  return useMutation({ mutationFn: (period?: string) => ReportsAPI.exportMedicationsExcel(period) });
}

// ── Residents ──────────────────────────────────────────────────────────────

export function useResidentsDashboard(period?: string) {
  return useQuery({
    queryKey: ['reports', 'residents', 'dashboard', period],
    queryFn: () => ReportsAPI.getResidentsDashboard(period),
  });
}

export function useResidentsOccupancy(months = 6) {
  return useQuery({
    queryKey: ['reports', 'residents', 'occupancy', months],
    queryFn: () => ReportsAPI.getResidentsOccupancy(months),
  });
}

export function useGenerateResidentPDF() {
  return useMutation({
    mutationFn: ({ residentId, period }: { residentId: string; period?: string }) =>
      ReportsAPI.generateResidentPDF(residentId, period),
  });
}

// ── Financial ──────────────────────────────────────────────────────────────

export function useFinancialReportDashboard(period?: string) {
  return useQuery({
    queryKey: ['reports', 'financial', 'dashboard', period],
    queryFn: () => ReportsAPI.getFinancialDashboard(period),
  });
}

export function useAccountsReceivable() {
  return useQuery({
    queryKey: ['reports', 'financial', 'accounts-receivable'],
    queryFn: () => ReportsAPI.getAccountsReceivable(),
  });
}

export function useTopDebtors(limit = 10) {
  return useQuery({
    queryKey: ['reports', 'financial', 'top-debtors', limit],
    queryFn: () => ReportsAPI.getTopDebtors(limit),
  });
}

export function useFinancialForecast() {
  return useQuery({
    queryKey: ['reports', 'financial', 'forecast'],
    queryFn: () => ReportsAPI.getFinancialForecast(),
  });
}

export function useGenerateFinancialConsolidated() {
  return useMutation({
    mutationFn: ({ period, format }: { period?: string; format?: 'pdf' | 'xlsx' }) =>
      ReportsAPI.generateFinancialConsolidated(period, format),
  });
}

// ── Staff ──────────────────────────────────────────────────────────────────

export function useStaffDashboard(period?: string) {
  return useQuery({
    queryKey: ['reports', 'staff', 'dashboard', period],
    queryFn: () => ReportsAPI.getStaffDashboard(period),
  });
}

export function useGenerateStaffTimesheet() {
  return useMutation({
    mutationFn: ({ period, format }: { period?: string; format?: 'pdf' | 'xlsx' }) =>
      ReportsAPI.generateStaffTimesheet(period, format),
  });
}

export function useExportStaffExcel() {
  return useMutation({ mutationFn: (period?: string) => ReportsAPI.exportStaffExcel(period) });
}
