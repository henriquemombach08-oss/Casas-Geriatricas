import { prisma } from '../lib/prisma.js';
import type { AIScheduleSuggestion } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StaffPattern {
  userId: string;
  name: string;
  role: string;
  preferredShifts: Record<string, number>; // shift -> count
  absenceRate: number;  // 0-1
  lateRate: number;     // 0-1
  totalScheduled: number;
  reliabilityScore: number; // 0-100 (higher = more reliable)
}

export interface ScheduleConflict {
  type: 'double_booking' | 'insufficient_rest' | 'consecutive_nights' | 'overworked';
  userId: string;
  userName: string;
  date: string;
  shift?: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SuggestedScheduleEntry {
  userId: string;
  userName: string;
  userRole: string;
  date: string;
  shift: string;
  confidence: number; // 0-100
  reason: string;
}

export interface ScheduleSuggestion {
  id: string;
  score: number;        // 0-100
  coverageRate: number; // % of shifts covered
  entries: SuggestedScheduleEntry[];
  warnings: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMonthRange(month: string): { start: Date; end: Date } {
  const [year, mon] = month.split('-');
  const start = new Date(`${year!}-${mon!}-01`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

function getDaysInMonth(month: string): string[] {
  const [year, mon] = month.split('-').map(Number);
  const count = new Date(year!, mon!, 0).getDate();
  const days: string[] = [];
  for (let d = 1; d <= count; d++) {
    days.push(`${year!}-${String(mon!).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

/** Parse HH:MM into minutes since midnight */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Shift end hour (next-day minutes use +1440 for night) */
function shiftEndMinutes(shift: string): number {
  const ends: Record<string, number> = {
    morning:   13 * 60,
    afternoon: 19 * 60,
    night:     7 * 60 + 1440, // 07:00 next day
    full_day:  19 * 60,
    on_call:   24 * 60,
  };
  return ends[shift] ?? 24 * 60;
}

function shiftStartMinutes(shift: string): number {
  const starts: Record<string, number> = {
    morning:   7 * 60,
    afternoon: 13 * 60,
    night:     19 * 60,
    full_day:  7 * 60,
    on_call:   0,
  };
  return starts[shift] ?? 0;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

// ─── analyzeStaffPatterns ─────────────────────────────────────────────────────

export async function analyzeStaffPatterns(
  houseId: string,
  monthsBack = 3,
): Promise<StaffPattern[]> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack);

  // Fetch all active staff
  const staff = await prisma.user.findMany({
    where: { houseId, active: true },
    select: { id: true, name: true, role: true },
  });

  // Fetch historical schedules in the look-back window
  const schedules = await prisma.workSchedule.findMany({
    where: {
      houseId,
      scheduleDate: { gte: cutoff },
    },
    select: {
      userId: true,
      shift: true,
      status: true,
      checkedInAt: true,
      startTime: true,
      scheduleDate: true,
    },
  });

  const patterns: StaffPattern[] = [];

  for (const member of staff) {
    const memberSchedules = schedules.filter((s) => s.userId === member.id);
    const totalScheduled = memberSchedules.length;

    // Preferred shifts
    const preferredShifts: Record<string, number> = {};
    for (const s of memberSchedules) {
      preferredShifts[s.shift] = (preferredShifts[s.shift] ?? 0) + 1;
    }

    // Absence rate
    const absences = memberSchedules.filter((s) => s.status === 'no_show').length;
    const absenceRate = totalScheduled > 0 ? absences / totalScheduled : 0;

    // Late rate: present schedules where checkedInAt > startTime + 10 min
    const presentSchedules = memberSchedules.filter(
      (s) => s.status === 'present' && s.checkedInAt && s.startTime,
    );
    let lateCount = 0;
    for (const s of presentSchedules) {
      if (s.checkedInAt && s.startTime) {
        const dateStr = s.scheduleDate.toISOString().split('T')[0]!;
        const expectedMs = new Date(`${dateStr}T${s.startTime}`).getTime();
        const actualMs = s.checkedInAt.getTime();
        if (actualMs > expectedMs + 10 * 60 * 1000) lateCount++;
      }
    }
    const lateRate = presentSchedules.length > 0 ? lateCount / presentSchedules.length : 0;

    // Confirmations bonus
    const confirmations = memberSchedules.filter(
      (s) => s.status === 'confirmed' || s.status === 'present',
    ).length;
    const confirmationBonus =
      totalScheduled > 0 ? (confirmations / totalScheduled) * 10 : 0;

    // Reliability score: 100 - (absenceRate * 50) - (lateRate * 20) + confirmationBonus
    const reliabilityScore = Math.min(
      100,
      Math.max(0, 100 - absenceRate * 50 - lateRate * 20 + confirmationBonus),
    );

    patterns.push({
      userId: member.id,
      name: member.name,
      role: member.role,
      preferredShifts,
      absenceRate,
      lateRate,
      totalScheduled,
      reliabilityScore: Math.round(reliabilityScore),
    });
  }

  return patterns;
}

// ─── detectConflicts ──────────────────────────────────────────────────────────

export async function detectConflicts(
  houseId: string,
  month: string,
): Promise<ScheduleConflict[]> {
  const { start, end } = buildMonthRange(month);

  const schedules = await prisma.workSchedule.findMany({
    where: {
      houseId,
      scheduleDate: { gte: start, lt: end },
      status: { notIn: ['no_show', 'excused_absence'] },
    },
    include: { user: { select: { name: true } } },
    orderBy: [{ userId: 'asc' }, { scheduleDate: 'asc' }],
  });

  const conflicts: ScheduleConflict[] = [];

  // Group by userId
  const byUser = new Map<string, typeof schedules>();
  for (const s of schedules) {
    const list = byUser.get(s.userId) ?? [];
    list.push(s);
    byUser.set(s.userId, list);
  }

  for (const [userId, userSchedules] of byUser) {
    const userName = userSchedules[0]?.user.name ?? userId;

    // Sort by date then shift start
    const sorted = [...userSchedules].sort((a, b) => {
      const dateDiff = a.scheduleDate.getTime() - b.scheduleDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      return shiftStartMinutes(a.shift) - shiftStartMinutes(b.shift);
    });

    // 1. Double booking: same date, same shift
    const dateShiftSet = new Set<string>();
    for (const s of sorted) {
      const key = `${s.scheduleDate.toISOString().split('T')[0]}-${s.shift}`;
      if (dateShiftSet.has(key)) {
        conflicts.push({
          type: 'double_booking',
          userId,
          userName,
          date: s.scheduleDate.toISOString().split('T')[0]!,
          shift: s.shift,
          description: `${userName} está escalado duas vezes para ${s.shift} no dia ${s.scheduleDate.toLocaleDateString('pt-BR')}`,
          severity: 'high',
        });
      }
      dateShiftSet.add(key);
    }

    // 2. Insufficient rest: night shift followed by morning shift next day (< 11h)
    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = sorted[i]!;
      const next = sorted[i + 1]!;

      const currDateStr = curr.scheduleDate.toISOString().split('T')[0]!;
      const nextDateStr = next.scheduleDate.toISOString().split('T')[0]!;

      // Calculate end time of current shift
      const currDate = new Date(curr.scheduleDate);
      const currEndMin = shiftEndMinutes(curr.shift);
      const currEndMs =
        currDate.getTime() + (currEndMin > 1440 ? currEndMin - 1440 + 1440 : currEndMin) * 60000;

      // Actually compute properly: end of current shift in absolute ms
      const currShiftEndAbsoluteMs = (() => {
        const baseMs = curr.scheduleDate.getTime();
        const endMins = shiftEndMinutes(curr.shift);
        // night shift ends next day at 07:00
        if (curr.shift === 'night') {
          return baseMs + 24 * 3600000 - (19 - 7) * 3600000; // next day 07:00
        }
        return baseMs + endMins * 60000;
      })();

      const nextShiftStartAbsoluteMs = (() => {
        const baseMs = next.scheduleDate.getTime();
        return baseMs + shiftStartMinutes(next.shift) * 60000;
      })();

      const restHours = (nextShiftStartAbsoluteMs - currShiftEndAbsoluteMs) / 3600000;

      if (restHours >= 0 && restHours < 11) {
        conflicts.push({
          type: 'insufficient_rest',
          userId,
          userName,
          date: nextDateStr,
          shift: next.shift,
          description: `${userName} tem menos de 11h de descanso entre ${currDateStr} (${curr.shift}) e ${nextDateStr} (${next.shift})`,
          severity: restHours < 8 ? 'high' : 'medium',
        });
      }
    }

    // 3. Consecutive nights: 4+ consecutive night shifts
    let consecutiveNights = 0;
    let consecutiveStart = '';
    for (const s of sorted) {
      if (s.shift === 'night') {
        consecutiveNights++;
        if (consecutiveNights === 1) {
          consecutiveStart = s.scheduleDate.toISOString().split('T')[0]!;
        }
        if (consecutiveNights >= 4) {
          conflicts.push({
            type: 'consecutive_nights',
            userId,
            userName,
            date: s.scheduleDate.toISOString().split('T')[0]!,
            description: `${userName} tem ${consecutiveNights} turnos noturnos consecutivos a partir de ${consecutiveStart}`,
            severity: 'medium',
          });
        }
      } else {
        consecutiveNights = 0;
        consecutiveStart = '';
      }
    }

    // 4. Overworked: > 22 shifts in the month
    if (sorted.length > 22) {
      conflicts.push({
        type: 'overworked',
        userId,
        userName,
        date: month + '-01',
        description: `${userName} tem ${sorted.length} turnos no mês (máximo recomendado: 22)`,
        severity: sorted.length > 26 ? 'high' : 'medium',
      });
    }
  }

  return conflicts;
}

// ─── predictAbsenceRisk ───────────────────────────────────────────────────────

export async function predictAbsenceRisk(
  houseId: string,
  month: string,
): Promise<
  Array<{
    userId: string;
    userName: string;
    role: string;
    absenceRisk: number;
    lateRisk: number;
    riskFactors: string[];
  }>
> {
  const patterns = await analyzeStaffPatterns(houseId, 3);
  const { start, end } = buildMonthRange(month);

  // Get recent 30-day schedules for day-of-week analysis
  const recentCutoff = new Date();
  recentCutoff.setDate(recentCutoff.getDate() - 30);

  const recentSchedules = await prisma.workSchedule.findMany({
    where: {
      houseId,
      scheduleDate: { gte: recentCutoff },
    },
    select: { userId: true, status: true, scheduleDate: true },
  });

  // Get upcoming month schedules
  const upcomingSchedules = await prisma.workSchedule.findMany({
    where: {
      houseId,
      scheduleDate: { gte: start, lt: end },
    },
    select: { userId: true, scheduleDate: true },
  });

  const results = [];

  for (const pattern of patterns) {
    const riskFactors: string[] = [];
    let absenceRisk = pattern.absenceRate * 100;
    let lateRisk = pattern.lateRate * 100;

    // Factor: recent absences (last 30 days) — amplify signal
    const recentUserSchedules = recentSchedules.filter((s) => s.userId === pattern.userId);
    const recentAbsences = recentUserSchedules.filter((s) => s.status === 'no_show').length;
    if (recentAbsences > 0) {
      absenceRisk += recentAbsences * 15;
      riskFactors.push(`${recentAbsences} ausência(s) nos últimos 30 dias`);
    }

    // Factor: day-of-week pattern (if user tends to miss Mondays/Fridays)
    const userUpcoming = upcomingSchedules.filter((s) => s.userId === pattern.userId);
    const mondayFridayCount = userUpcoming.filter((s) => {
      const dow = new Date(s.scheduleDate).getDay();
      return dow === 1 || dow === 5;
    }).length;
    if (mondayFridayCount > 0 && pattern.absenceRate > 0.1) {
      absenceRisk += 5;
      riskFactors.push(`Histórico de ausências em dias de maior risco`);
    }

    // Cap risks
    absenceRisk = Math.min(100, Math.round(absenceRisk));
    lateRisk = Math.min(100, Math.round(lateRisk));

    if (pattern.absenceRate > 0.2) {
      riskFactors.push(`Taxa histórica de ausências: ${Math.round(pattern.absenceRate * 100)}%`);
    }
    if (pattern.lateRate > 0.2) {
      riskFactors.push(`Taxa histórica de atrasos: ${Math.round(pattern.lateRate * 100)}%`);
    }
    if (pattern.totalScheduled < 5) {
      riskFactors.push('Histórico insuficiente para análise precisa');
    }

    results.push({
      userId: pattern.userId,
      userName: pattern.name,
      role: pattern.role,
      absenceRisk,
      lateRisk,
      riskFactors,
    });
  }

  // Sort by absenceRisk descending
  return results.sort((a, b) => b.absenceRisk - a.absenceRisk);
}

// ─── suggestSchedule ──────────────────────────────────────────────────────────

const ELIGIBLE_ROLES = new Set(['nurse', 'caregiver']);

// Required staff per shift
const REQUIRED_COVERAGE: Record<string, number> = {
  morning: 2,
  afternoon: 2,
  night: 1,
  on_call: 1,
};

const SHIFTS_TO_COVER = ['morning', 'afternoon', 'night', 'on_call'] as const;

export async function suggestSchedule(
  houseId: string,
  month: string,
  options?: { minStaffPerShift?: number; preferBalanced?: boolean },
): Promise<ScheduleSuggestion> {
  const patterns = await analyzeStaffPatterns(houseId, 3);
  const eligibleStaff = patterns.filter((p) => ELIGIBLE_ROLES.has(p.role));

  if (eligibleStaff.length === 0) {
    return {
      id: generateId(),
      score: 0,
      coverageRate: 0,
      entries: [],
      warnings: ['Nenhum funcionário elegível (enfermeiros/cuidadores) encontrado.'],
    };
  }

  const days = getDaysInMonth(month);
  const entries: SuggestedScheduleEntry[] = [];
  const warnings: string[] = [];

  // Track how many shifts each staff member gets this month
  const monthShiftCount: Record<string, number> = {};
  for (const s of eligibleStaff) monthShiftCount[s.userId] = 0;

  // Track last shift end for rest-period checks (absolute ms)
  const lastShiftEnd: Record<string, number> = {};

  let totalRequired = 0;
  let totalAssigned = 0;
  let totalReliability = 0;
  let reliabilityCount = 0;

  for (const day of days) {
    for (const shift of SHIFTS_TO_COVER) {
      const required =
        options?.minStaffPerShift ??
        REQUIRED_COVERAGE[shift] ??
        1;

      totalRequired += required;

      const dayMs = new Date(day).getTime();
      const shiftStartMs = dayMs + shiftStartMinutes(shift) * 60000;
      const shiftEndMs = dayMs + shiftEndMinutes(shift) * 60000;

      // Score and rank eligible staff
      const ranked = eligibleStaff
        .map((staff) => {
          const currentShifts = monthShiftCount[staff.userId] ?? 0;
          const overloadFactor = Math.min(1, currentShifts / 22);

          // Shift preference score (0-1)
          const totalShifts = Object.values(staff.preferredShifts).reduce((a, b) => a + b, 0);
          const shiftPref =
            totalShifts > 0 ? (staff.preferredShifts[shift] ?? 0) / totalShifts : 0.2;

          const score =
            (staff.reliabilityScore / 100) * 0.5 +
            shiftPref * 0.3 +
            (1 - overloadFactor) * 0.2;

          return { staff, score };
        })
        .sort((a, b) => b.score - a.score);

      let assigned = 0;
      for (const { staff, score } of ranked) {
        if (assigned >= required) break;

        // Check rest period from last shift
        const lastEnd = lastShiftEnd[staff.userId] ?? 0;
        const restMs = shiftStartMs - lastEnd;
        const restHours = restMs / 3600000;

        if (lastEnd > 0 && restHours < 11) {
          // Not enough rest, skip this staff member for this slot
          continue;
        }

        // Assign
        const confidence = Math.round(Math.min(100, score * 100));
        const shiftPrefCount = staff.preferredShifts[shift] ?? 0;
        const reason =
          shiftPrefCount > 2
            ? `Preferência pelo turno ${shift} (${shiftPrefCount}x histórico)`
            : `Confiabilidade: ${staff.reliabilityScore}/100`;

        entries.push({
          userId: staff.userId,
          userName: staff.name,
          userRole: staff.role,
          date: day,
          shift,
          confidence,
          reason,
        });

        monthShiftCount[staff.userId] = (monthShiftCount[staff.userId] ?? 0) + 1;
        lastShiftEnd[staff.userId] = shiftEndMs;
        totalAssigned++;
        totalReliability += staff.reliabilityScore;
        reliabilityCount++;
        assigned++;
      }

      if (assigned < required) {
        warnings.push(
          `${day} (${shift}): apenas ${assigned}/${required} funcionários disponíveis`,
        );
      }
    }
  }

  const coverageRate = totalRequired > 0 ? (totalAssigned / totalRequired) * 100 : 0;
  const avgReliability = reliabilityCount > 0 ? totalReliability / reliabilityCount : 0;
  const score = Math.round((coverageRate / 100) * 70 + (avgReliability / 100) * 30);

  if (options?.preferBalanced) {
    // Check if anyone is overloaded
    for (const [userId, count] of Object.entries(monthShiftCount)) {
      if (count > 22) {
        const name = eligibleStaff.find((s) => s.userId === userId)?.name ?? userId;
        warnings.push(`${name} foi escalado para ${count} turnos (acima de 22 recomendados)`);
      }
    }
  }

  return {
    id: generateId(),
    score,
    coverageRate: Math.round(coverageRate * 10) / 10,
    entries,
    warnings,
  };
}

// ─── generateAndSave ──────────────────────────────────────────────────────────

export async function generateAndSave(
  houseId: string,
  month: string,
  generatedBy?: string,
): Promise<AIScheduleSuggestion> {
  const [suggestion, conflicts, absenceRisk] = await Promise.all([
    suggestSchedule(houseId, month, { preferBalanced: true }),
    detectConflicts(houseId, month),
    predictAbsenceRisk(houseId, month),
  ]);

  const saved = await prisma.aIScheduleSuggestion.create({
    data: {
      houseId,
      month,
      suggestions: suggestion as unknown as Parameters<typeof prisma.aIScheduleSuggestion.create>[0]['data']['suggestions'],
      conflicts: conflicts as unknown as Parameters<typeof prisma.aIScheduleSuggestion.create>[0]['data']['conflicts'],
      absenceRisk: absenceRisk as unknown as Parameters<typeof prisma.aIScheduleSuggestion.create>[0]['data']['absenceRisk'],
      generatedBy: generatedBy ?? null,
    },
  });

  return saved;
}
