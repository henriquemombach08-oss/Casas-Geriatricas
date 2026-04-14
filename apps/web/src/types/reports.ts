// ─── Shared ──────────────────────────────────────────────────────────────────

export type TrendDirection = 'up' | 'down' | 'stable';
export type StaffPerformance = 'excellent' | 'good' | 'fair' | 'poor';

export interface MonthlyDataPoint {
  month: string;
  label: string;
  value: number;
}

// ─── Medications ─────────────────────────────────────────────────────────────

export interface MedicationsDashboard {
  month: string;
  total_medications: number;
  active_medications: number;
  total_administered: number;
  total_refused: number;
  total_missed: number;
  adherence_rate: number;
  expiring_soon: number;
  by_resident: Array<{
    resident_id: string;
    resident_name: string;
    total_prescribed: number;
    administered: number;
    refused: number;
    missed: number;
    adherence_rate: number;
  }>;
  by_day: Array<{ date: string; administered: number; refused: number; missed: number }>;
}

export interface MedicationsAdherence {
  months: string[];
  rates: number[];
  trend: TrendDirection;
  current_rate: number;
  previous_rate: number;
  monthly_details: Array<{
    month: string;
    label: string;
    adherence_rate: number;
    total_administered: number;
    total_prescribed: number;
  }>;
}

// ─── Residents ───────────────────────────────────────────────────────────────

export interface ResidentsDashboard {
  period: string;
  total_residents: number;
  active_residents: number;
  new_admissions: number;
  discharges: number;
  average_age: number;
  occupancy_rate: number;
  total_capacity: number;
  age_distribution: Array<{ range: string; count: number }>;
  diagnoses: Array<{ name: string; count: number }>;
  care_levels: Array<{ level: string; count: number }>;
}

export interface ResidentsOccupancy {
  current_occupancy: number;
  total_capacity: number;
  occupancy_rate: number;
  monthly_trend: MonthlyDataPoint[];
}

// ─── Financial ───────────────────────────────────────────────────────────────

export interface FinancialDashboard {
  period: string;
  total_revenue: number;
  total_expenses: number;
  net_result: number;
  pending_amount: number;
  overdue_amount: number;
  collection_rate: number;
  by_category: Array<{ category: string; label: string; amount: number; count: number }>;
  monthly_trend: Array<{
    month: string;
    label: string;
    revenue: number;
    expenses: number;
    net: number;
  }>;
}

export interface AccountsReceivable {
  total_pending: number;
  total_overdue: number;
  records: Array<{
    id: string;
    resident_name: string;
    description: string;
    amount: number;
    due_date: string;
    status: string;
    days_overdue: number;
  }>;
}

export interface TopDebtor {
  resident_id: string;
  resident_name: string;
  total_pending: number;
  overdue_count: number;
  oldest_due_date: string;
}

export interface FinancialForecast {
  next_month: string;
  projected_revenue: number;
  projected_expenses: number;
  projected_net: number;
  confirmed_revenue: number;
  historical_average_revenue: number;
  historical_average_expenses: number;
}

// ─── Staff ───────────────────────────────────────────────────────────────────

export interface StaffDashboard {
  period: string;
  total_staff: number;
  active_today: number;
  absent_today: number;
  hours_scheduled: number;
  hours_worked: number;
  absence_rate: number;
  late_count: number;
  by_role: Array<{
    role: string;
    count: number;
    hours_scheduled: number;
    hours_worked: number;
    utilization_rate: number;
  }>;
  individual_staff: Array<{
    staff_id: string;
    name: string;
    role: string;
    hours_scheduled: number;
    hours_worked: number;
    overtime_hours: number;
    absence_count: number;
    absence_rate: number;
    punctuality_rate: number;
    trend: StaffPerformance;
  }>;
}
