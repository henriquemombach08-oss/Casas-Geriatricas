/**
 * Pure helper functions for report calculations — importable by tests without side effects.
 */

export interface AdherenceInput {
  total_prescribed: number;
  administered: number;
  refused: number;
  missed: number;
}

/** Returns adherence rate as a percentage rounded to 1 decimal. */
export function calculateAdherence(data: AdherenceInput): number {
  if (data.total_prescribed === 0) return 0;
  return Math.round((data.administered / data.total_prescribed) * 1000) / 10;
}

/** Returns "up" | "down" | "stable" comparing current vs previous rate. */
export function adherenceTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  if (current > previous + 1) return 'up';
  if (current < previous - 1) return 'down';
  return 'stable';
}

/** Returns "excellent" | "good" | "fair" | "poor" for staff performance. */
export function staffTrend(punctualityRate: number, absenceRate: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (punctualityRate >= 95 && absenceRate < 3) return 'excellent';
  if (punctualityRate >= 85 && absenceRate < 8) return 'good';
  if (punctualityRate >= 70 && absenceRate < 15) return 'fair';
  return 'poor';
}

/** Format a month YYYY-MM into a friendly month label. */
export function formatMonthLabel(yyyymm: string): string {
  const [year, mon] = yyyymm.split('-');
  const d = new Date(Number(year), Number(mon) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

/** Generates an array of YYYY-MM strings for the last N months ending at `endMonth`. */
export function buildMonthRange(endMonth: string, count: number): string[] {
  const [year, mon] = endMonth.split('-').map(Number);
  const result: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(year!, mon! - 1 - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}

/** Parses a YYYY-MM string and returns {start, end} Date range. */
export function monthToRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(y!, m! - 1, 1);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

/** Returns {start, end} for a named period: "month", "quarter", "year", or YYYY-MM. */
export function parsePeriodParam(period = 'month'): { start: Date; end: Date } {
  const now = new Date();
  if (/^\d{4}-\d{2}$/.test(period)) return monthToRange(period);
  if (period === 'quarter') {
    const start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 3);
    return { start, end };
  }
  if (period === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear() + 1, 0, 1);
    return { start, end };
  }
  // Default: current month
  return monthToRange(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
}
