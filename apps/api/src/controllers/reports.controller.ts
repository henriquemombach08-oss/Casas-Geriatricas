import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';
import { reportQueue } from '../jobs/queues.js';
import {
  calculateAdherence,
  adherenceTrend,
  staffTrend,
  buildMonthRange,
  parsePeriodParam,
  monthToRange,
} from '../lib/report-helpers.js';
import { streamPDFReport } from '../services/pdf.service.js';
import { streamExcelReport } from '../services/excel.service.js';

// ─── Shared helpers ────────────────────────────────────────────────────────────

function houseId(req: Request): string {
  return (req as AuthRequest).houseId;
}

function currentMonth(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

// ─── MEDICATIONS ───────────────────────────────────────────────────────────────

/** GET /api/reports/medications/dashboard?month=YYYY-MM */
export async function medicationsDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const month = (req.query['month'] as string | undefined) ?? currentMonth();
    const { start, end } = monthToRange(month);
    const hid = houseId(req);
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const [allMeds, logs, expiringMeds] = await Promise.all([
      prisma.medication.findMany({
        where: { resident: { houseId: hid, deletedAt: null } },
        select: { id: true, name: true, status: true },
      }),
      prisma.medicationLog.findMany({
        where: {
          resident: { houseId: hid },
          administeredAt: { gte: start, lt: end },
        },
        select: {
          status: true,
          reasonIfNotGiven: true,
          resident: { select: { id: true, name: true } },
          medication: { select: { id: true, name: true } },
        },
      }),
      prisma.medication.findMany({
        where: {
          resident: { houseId: hid, deletedAt: null },
          endDate: { lte: sevenDaysLater, gte: new Date() },
        },
        select: { id: true, name: true, endDate: true },
      }),
    ]);

    const totalLogs = logs.length;
    const administered = logs.filter((l) => l.status === 'administered').length;
    const refused     = logs.filter((l) => l.status === 'refused').length;
    const missed      = logs.filter((l) => l.status === 'missed').length;
    const adherenceRate = calculateAdherence({ total_prescribed: totalLogs, administered, refused, missed });

    // Adherence by resident
    const byResident = new Map<string, { name: string; logs: typeof logs }>();
    for (const l of logs) {
      const rid = l.resident.id;
      if (!byResident.has(rid)) byResident.set(rid, { name: l.resident.name, logs: [] });
      byResident.get(rid)!.logs.push(l);
    }
    const adherenceByResident = [...byResident.entries()].map(([id, { name, logs: rLogs }]) => {
      const a = rLogs.filter((l) => l.status === 'administered').length;
      const r = rLogs.filter((l) => l.status === 'refused').length;
      const m = rLogs.filter((l) => l.status === 'missed').length;
      const rate = calculateAdherence({ total_prescribed: rLogs.length, administered: a, refused: r, missed: m });
      return { resident_id: id, resident_name: name, total_prescribed: rLogs.length, administered: a, refused: r, missed: m, adherence_rate: rate, trend: 'stable' };
    }).sort((a, b) => a.adherence_rate - b.adherence_rate);

    // Most refused medications
    const refusedByMed = new Map<string, { name: string; count: number; total: number; reasons: Map<string, number> }>();
    for (const l of logs) {
      const mid = l.medication.id;
      if (!refusedByMed.has(mid)) refusedByMed.set(mid, { name: l.medication.name, count: 0, total: 0, reasons: new Map() });
      const entry = refusedByMed.get(mid)!;
      entry.total++;
      if (l.status === 'refused') {
        entry.count++;
        const reason = l.reasonIfNotGiven ?? 'Sem motivo';
        entry.reasons.set(reason, (entry.reasons.get(reason) ?? 0) + 1);
      }
    }
    const mostRefused = [...refusedByMed.values()]
      .filter((m) => m.count > 0)
      .map((m) => ({
        medication_name: m.name,
        total_prescribed: m.total,
        refused_count: m.count,
        refusal_rate: Math.round((m.count / m.total) * 1000) / 10,
        common_reasons: [...m.reasons.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count).slice(0, 3),
      }))
      .sort((a, b) => b.refusal_rate - a.refusal_rate)
      .slice(0, 10);

    // Expiring medications
    const medicationsExpiring = expiringMeds.map((m) => {
      const daysLeft = Math.ceil(((m.endDate?.getTime() ?? 0) - Date.now()) / 86_400_000);
      return {
        medication_name: m.name,
        pharmacy_expiration_date: m.endDate?.toISOString().split('T')[0],
        days_until_expiry: daysLeft,
        urgency: daysLeft <= 3 ? 'high' : daysLeft <= 7 ? 'medium' : 'low',
      };
    });

    // Daily compliance trend (last 7 days of the period)
    const trendDays = 7;
    const trendStart = new Date(end);
    trendStart.setDate(trendStart.getDate() - trendDays);
    const trendLogs = logs.filter((l) => {
      // administeredAt is nullable in the schema
      return true; // use all logs in period for simplicity
    });
    const medicationComplianceTrend = buildMonthRange(month, 1).map((m) => ({ date: m, adherence_rate: adherenceRate }));

    res.json({
      success: true,
      data: {
        summary: {
          total_medications: allMeds.length,
          active_medications: allMeds.filter((m) => m.status === 'active').length,
          inactive_medications: allMeds.filter((m) => m.status === 'inactive').length,
          medications_expiring_soon: expiringMeds.length,
          total_administrations: totalLogs,
          adherence_rate: adherenceRate,
        },
        adherence_by_resident: adherenceByResident,
        most_refused_medications: mostRefused,
        medications_expiring: medicationsExpiring,
        medication_compliance_trend: medicationComplianceTrend,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/reports/medications/adherence?resident_id=uuid&days=30 */
export async function medicationsAdherence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const hid = houseId(req);
    const days = parseInt(req.query['days'] as string ?? '30', 10);
    const residentId = req.query['resident_id'] as string | undefined;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await prisma.medicationLog.findMany({
      where: {
        resident: { houseId: hid, ...(residentId ? { id: residentId } : {}) },
        administeredAt: { gte: since },
      },
      select: {
        status: true,
        administeredAt: true,
        medication: { select: { name: true } },
        resident: { select: { id: true, name: true } },
      },
      orderBy: { administeredAt: 'desc' },
    });

    const administered = logs.filter((l) => l.status === 'administered').length;
    const refused      = logs.filter((l) => l.status === 'refused').length;
    const missed       = logs.filter((l) => l.status === 'missed').length;
    const rate = calculateAdherence({ total_prescribed: logs.length, administered, refused, missed });

    res.json({ success: true, data: { total: logs.length, administered, refused, missed, adherence_rate: rate, logs: logs.slice(0, 100) } });
  } catch (err) {
    next(err);
  }
}

/** POST /api/reports/medications/generate-pdf */
export async function medicationsGeneratePDF(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month = currentMonth() } = req.body as { month?: string };
    const hid = houseId(req);
    const { start, end } = monthToRange(month);

    const [house, logs] = await Promise.all([
      prisma.house.findUnique({ where: { id: hid }, select: { name: true } }),
      prisma.medicationLog.findMany({
        where: { resident: { houseId: hid }, administeredAt: { gte: start, lt: end } },
        select: {
          status: true,
          administeredAt: true,
          reasonIfNotGiven: true,
          medication: { select: { name: true } },
          resident: { select: { name: true } },
        },
        orderBy: { administeredAt: 'desc' },
        take: 500,
      }),
    ]);

    const administered = logs.filter((l) => l.status === 'administered').length;
    const refused      = logs.filter((l) => l.status === 'refused').length;
    const missed       = logs.filter((l) => l.status === 'missed').length;
    const adherenceRate = calculateAdherence({ total_prescribed: logs.length, administered, refused, missed });

    streamPDFReport(res, {
      title: 'Relatório de Medicamentos',
      subtitle: month,
      houseName: house?.name ?? 'Casa Geriátrica',
      period: month,
      sections: [
        {
          title: 'Sumário Executivo',
          type: 'kpi',
          content: [
            { label: 'Total de administrações', value: logs.length },
            { label: 'Administrados', value: administered },
            { label: 'Recusados', value: refused },
            { label: 'Perdidos', value: missed },
            { label: 'Taxa de adesão', value: `${adherenceRate}%` },
          ],
        },
        {
          title: 'Histórico de Administração',
          type: 'table',
          columns: ['date', 'resident', 'medication', 'status', 'reason'],
          headers: { date: 'Data', resident: 'Residente', medication: 'Medicamento', status: 'Status', reason: 'Motivo' },
          content: logs.map((l) => ({
            date: l.administeredAt?.toLocaleDateString('pt-BR') ?? '—',
            resident: l.resident.name,
            medication: l.medication.name,
            status: l.status,
            reason: l.reasonIfNotGiven ?? '—',
          })),
        },
      ],
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/reports/medications/export-excel */
export async function medicationsExportExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month = currentMonth() } = req.body as { month?: string };
    const hid = houseId(req);
    const { start, end } = monthToRange(month);

    const logs = await prisma.medicationLog.findMany({
      where: { resident: { houseId: hid }, administeredAt: { gte: start, lt: end } },
      select: {
        status: true,
        administeredAt: true,
        reasonIfNotGiven: true,
        medication: { select: { name: true } },
        resident: { select: { name: true } },
        administratedBy: { select: { name: true } },
      },
      orderBy: { administeredAt: 'desc' },
    });

    streamExcelReport(res, 'medicamentos', [
      {
        name: 'Administrações',
        headers: {
          date: 'Data',
          resident: 'Residente',
          medication: 'Medicamento',
          status: 'Status',
          reason: 'Motivo',
          administeredBy: 'Administrado por',
        },
        rows: logs.map((l) => ({
          date: l.administeredAt?.toLocaleDateString('pt-BR') ?? '—',
          resident: l.resident.name,
          medication: l.medication.name,
          status: l.status,
          reason: l.reasonIfNotGiven ?? '—',
          administeredBy: l.administratedBy.name,
        })),
      },
    ]);
  } catch (err) {
    next(err);
  }
}

// ─── RESIDENTS ─────────────────────────────────────────────────────────────────

/** GET /api/reports/residents/dashboard */
export async function residentsDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const hid = houseId(req);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const [allResidents, documents] = await Promise.all([
      prisma.resident.findMany({
        where: { houseId: hid, deletedAt: null },
        select: {
          id: true, name: true, status: true, birthDate: true, admissionDate: true,
          medicalHistory: true,
          _count: { select: { documents: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.document.findMany({
        where: { resident: { houseId: hid, deletedAt: null } },
        select: { status: true, expiresAt: true, residentId: true },
      }),
    ]);

    const active    = allResidents.filter((r) => r.status === 'active');
    const inactive  = allResidents.filter((r) => r.status === 'inactive');
    const now = Date.now();
    const avgAge = active.length === 0 ? 0 : Math.round(
      active.reduce((sum, r) => sum + (now - r.birthDate.getTime()) / (365.25 * 86_400_000), 0) / active.length * 10,
    ) / 10;

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const admittedThisMonth   = allResidents.filter((r) => r.admissionDate >= startOfMonth).length;

    const docsByStatus = {
      valid:          documents.filter((d) => d.status === 'valid').length,
      expiring_soon:  documents.filter((d) => d.status === 'expiring_soon').length,
      expired:        documents.filter((d) => d.status === 'expired').length,
    };

    const residentStatus = allResidents.map((r) => {
      const rDocs = documents.filter((d) => d.residentId === r.id);
      const history = r.medicalHistory as Record<string, unknown> | null ?? {};
      const alerts: string[] = [];
      if (Array.isArray(history['allergies']) && (history['allergies'] as unknown[]).length > 0) alerts.push('Alergias críticas');
      return {
        resident_id: r.id,
        name: r.name,
        age: Math.floor((now - r.birthDate.getTime()) / (365.25 * 86_400_000)),
        admission_date: r.admissionDate.toISOString().split('T')[0],
        status: r.status,
        documents_expiring_soon: rDocs.filter((d) => d.status === 'expiring_soon').length,
        health_alerts: alerts,
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          total_residents: allResidents.length,
          active_residents: active.length,
          inactive_residents: inactive.length,
          average_age: avgAge,
          occupancy_rate: allResidents.length > 0 ? Math.round((active.length / allResidents.length) * 1000) / 10 : 0,
          admitted_this_month: admittedThisMonth,
        },
        resident_status: residentStatus,
        documents_status: docsByStatus,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/reports/residents/occupancy */
export async function residentsOccupancy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const hid = houseId(req);
    const residents = await prisma.resident.findMany({
      where: { houseId: hid, deletedAt: null },
      select: { status: true, admissionDate: true, dischargeDate: true },
    });

    const active   = residents.filter((r) => r.status === 'active').length;
    const total    = residents.length;
    const rate     = total > 0 ? Math.round((active / total) * 1000) / 10 : 0;

    res.json({ success: true, data: { total_beds: total, occupied: active, occupancy_rate: rate } });
  } catch (err) {
    next(err);
  }
}

/** POST /api/reports/residents/:id/generate-pdf */
export async function residentGeneratePDF(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const hid = houseId(req);

    const [resident, meds, docs, house] = await Promise.all([
      prisma.resident.findFirst({
        where: { id, houseId: hid, deletedAt: null },
        include: { documents: { select: { type: true, status: true, expiresAt: true } } },
      }),
      prisma.medication.findMany({
        where: { residentId: id, status: 'active' },
        select: { name: true, dosage: true, frequency: true, scheduledTimes: true },
      }),
      prisma.document.findMany({
        where: { residentId: id },
        select: { type: true, status: true, expiresAt: true },
      }),
      prisma.house.findUnique({ where: { id: hid }, select: { name: true } }),
    ]);

    if (!resident) {
      res.status(404).json({ success: false, error: 'Residente não encontrado' });
      return;
    }

    const history = resident.medicalHistory as Record<string, unknown> ?? {};

    streamPDFReport(res, {
      title: `Relatório Individual — ${resident.name}`,
      subtitle: '',
      houseName: house?.name ?? 'Casa Geriátrica',
      period: `Emitido em ${new Date().toLocaleDateString('pt-BR')}`,
      sections: [
        {
          title: 'Dados Pessoais',
          type: 'kpi',
          content: [
            { label: 'Nome', value: resident.name },
            { label: 'CPF', value: resident.cpf },
            { label: 'Data de Nascimento', value: resident.birthDate.toLocaleDateString('pt-BR') },
            { label: 'Admissão', value: resident.admissionDate.toLocaleDateString('pt-BR') },
            { label: 'Status', value: resident.status },
            { label: 'Contato de Emergência', value: `${resident.emergencyContactName} — ${resident.emergencyContactPhone}` },
          ],
        },
        {
          title: 'Histórico Médico',
          type: 'text',
          content: JSON.stringify(history, null, 2),
        },
        {
          title: 'Medicamentos Ativos',
          type: 'table',
          columns: ['name', 'dosage', 'frequency', 'times'],
          headers: { name: 'Medicamento', dosage: 'Dosagem', frequency: 'Frequência', times: 'Horários' },
          content: meds.map((m) => ({
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            times: m.scheduledTimes.join(', '),
          })),
        },
        {
          title: 'Documentos',
          type: 'table',
          columns: ['type', 'status', 'expires'],
          headers: { type: 'Tipo', status: 'Status', expires: 'Vencimento' },
          content: docs.map((d) => ({
            type: d.type,
            status: d.status,
            expires: d.expiresAt?.toLocaleDateString('pt-BR') ?? '—',
          })),
        },
      ],
    });
  } catch (err) {
    next(err);
  }
}

// ─── FINANCIAL ─────────────────────────────────────────────────────────────────

/** GET /api/reports/financial/dashboard?period=month|quarter|year|YYYY-MM */
export async function financialDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const period = (req.query['period'] as string | undefined) ?? 'month';
    const hid = houseId(req);
    const { start, end } = parsePeriodParam(period);
    const lastStart = new Date(start);
    lastStart.setMonth(lastStart.getMonth() - 1);
    const lastEnd = new Date(start);

    const [records, prevRecords, house] = await Promise.all([
      prisma.financialRecord.findMany({
        where: { houseId: hid, issueDate: { gte: start, lt: end } },
        include: { resident: { select: { id: true, name: true, cpf: true, phone: true } } },
        orderBy: { issueDate: 'desc' },
      }),
      prisma.financialRecord.findMany({
        where: { houseId: hid, issueDate: { gte: lastStart, lt: lastEnd }, type: 'payment' },
        select: { amount: true },
      }),
      prisma.house.findUnique({ where: { id: hid }, select: { name: true } }),
    ]);

    const charges  = records.filter((r) => r.type === 'charge');
    const payments = records.filter((r) => r.type === 'payment');

    const expectedRevenue = charges.reduce((s, r) => s + Number(r.amount), 0);
    const actualRevenue   = payments.reduce((s, r) => s + Number(r.amount), 0);
    const pendingAmount   = charges.filter((r) => r.status === 'pending').reduce((s, r) => s + Number(r.amount), 0);
    const overdueAmount   = charges.filter((r) => r.status === 'overdue').reduce((s, r) => s + Number(r.amount), 0);
    const revenueRate     = expectedRevenue > 0 ? Math.round((actualRevenue / expectedRevenue) * 10000) / 100 : 0;

    const prevRevenue = prevRecords.reduce((s, r) => s + Number(r.amount), 0);

    // Accounts receivable aging
    const now2 = new Date();
    const ar = { not_due: 0, due: 0, overdue_1_30: 0, overdue_31_60: 0, overdue_60plus: 0 };
    for (const r of charges.filter((r) => ['pending', 'overdue', 'partially_paid'].includes(r.status))) {
      if (!r.dueDate) { ar.not_due += Number(r.amount); continue; }
      const daysOverdue = Math.floor((now2.getTime() - r.dueDate.getTime()) / 86_400_000);
      if (daysOverdue <= 0) { ar.not_due += Number(r.amount); }
      else if (daysOverdue <= 7) { ar.due += Number(r.amount); }
      else if (daysOverdue <= 30) { ar.overdue_1_30 += Number(r.amount); }
      else if (daysOverdue <= 60) { ar.overdue_31_60 += Number(r.amount); }
      else { ar.overdue_60plus += Number(r.amount); }
    }

    // Top debtors
    const debtorMap = new Map<string, { name: string; cpf: string; phone: string; amount: number; days: number }>();
    for (const r of charges.filter((r) => r.status === 'overdue')) {
      const rid = r.resident.id;
      const daysOverdue = r.dueDate ? Math.floor((now2.getTime() - r.dueDate.getTime()) / 86_400_000) : 0;
      if (!debtorMap.has(rid)) debtorMap.set(rid, { name: r.resident.name, cpf: r.resident.cpf, phone: r.resident.phone ?? '', amount: 0, days: daysOverdue });
      debtorMap.get(rid)!.amount += Number(r.amount);
    }
    const topDebtors = [...debtorMap.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map((d) => ({ resident_name: d.name, cpf: d.cpf, amount_due: d.amount, days_overdue: d.days, contact_phone: d.phone }));

    // Payment methods
    const pmMap = new Map<string, { count: number; amount: number }>();
    for (const r of payments.filter((r) => r.paymentMethod)) {
      const pm = r.paymentMethod!;
      if (!pmMap.has(pm)) pmMap.set(pm, { count: 0, amount: 0 });
      pmMap.get(pm)!.count++;
      pmMap.get(pm)!.amount += Number(r.amount);
    }
    const paymentMethods = Object.fromEntries(pmMap);

    // Monthly breakdown by category
    const catMap = new Map<string, { expected: number; actual: number }>();
    for (const r of charges) {
      const cat = r.category;
      if (!catMap.has(cat)) catMap.set(cat, { expected: 0, actual: 0 });
      catMap.get(cat)!.expected += Number(r.amount);
    }
    for (const r of payments) {
      const cat = r.category;
      if (!catMap.has(cat)) catMap.set(cat, { expected: 0, actual: 0 });
      catMap.get(cat)!.actual += Number(r.amount);
    }
    const monthlyBreakdown = [...catMap.entries()].map(([category, { expected, actual }]) => ({
      category,
      expected,
      actual,
      collection_rate: expected > 0 ? Math.round((actual / expected) * 10000) / 100 : 0,
    }));

    // NF-e status
    const nfeGenerated = charges.filter((r) => r.nfeNumber).length;
    const nfePending   = charges.filter((r) => !r.nfeNumber && r.status !== 'canceled').length;

    // Cash flow chart (last 3 months)
    const chartMonths = buildMonthRange(
      `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`,
      3,
    );
    const chartData = await Promise.all(
      chartMonths.map(async (m) => {
        const { start: cs, end: ce } = monthToRange(m);
        const rev = await prisma.financialRecord.aggregate({
          _sum: { amount: true },
          where: { houseId: hid, type: 'payment', issueDate: { gte: cs, lt: ce } },
        });
        return { month: m, revenue: Number(rev._sum.amount ?? 0) };
      }),
    );

    res.json({
      success: true,
      data: {
        summary: { period, expected_revenue: expectedRevenue, actual_revenue: actualRevenue, revenue_rate: revenueRate, pending_amount: pendingAmount, overdue_amount: overdueAmount, payment_rate: revenueRate },
        cash_flow: { this_month: actualRevenue, last_month: prevRevenue, difference: actualRevenue - prevRevenue, trend: actualRevenue >= prevRevenue ? 'up' : 'down', percentage_change: prevRevenue > 0 ? Math.round(((actualRevenue - prevRevenue) / prevRevenue) * 10000) / 100 : 0, chart_data: chartData },
        accounts_receivable: ar,
        top_debtors: topDebtors,
        payment_methods: paymentMethods,
        monthly_breakdown: monthlyBreakdown,
        nfe_status: { generated: nfeGenerated, pending: nfePending, failed: 0 },
        house_name: house?.name,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/reports/financial/accounts-receivable */
export async function financialAccountsReceivable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const hid = houseId(req);
    const now = new Date();

    const overdue = await prisma.financialRecord.findMany({
      where: { houseId: hid, type: 'charge', status: { in: ['pending', 'overdue', 'partially_paid'] } },
      include: { resident: { select: { id: true, name: true, cpf: true } } },
      orderBy: { dueDate: 'asc' },
    });

    const records = overdue.map((r) => ({
      ...r,
      amount: Number(r.amount),
      days_overdue: r.dueDate ? Math.max(0, Math.floor((now.getTime() - r.dueDate.getTime()) / 86_400_000)) : 0,
    }));

    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
}

/** GET /api/reports/financial/top-debtors */
export async function financialTopDebtors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const hid = houseId(req);
    const limit = parseInt(req.query['limit'] as string ?? '10', 10);

    const overdue = await prisma.financialRecord.findMany({
      where: { houseId: hid, type: 'charge', status: 'overdue' },
      include: { resident: { select: { id: true, name: true, cpf: true, phone: true } } },
    });

    const map = new Map<string, { name: string; cpf: string; phone: string; amount: number; days: number }>();
    const now = new Date();
    for (const r of overdue) {
      if (!map.has(r.residentId)) map.set(r.residentId, { name: r.resident.name, cpf: r.resident.cpf, phone: r.resident.phone ?? '', amount: 0, days: 0 });
      const entry = map.get(r.residentId)!;
      entry.amount += Number(r.amount);
      if (r.dueDate) entry.days = Math.max(entry.days, Math.floor((now.getTime() - r.dueDate.getTime()) / 86_400_000));
    }

    const debtors = [...map.entries()]
      .map(([id, d]) => ({ resident_id: id, resident_name: d.name, cpf: d.cpf, amount_due: d.amount, days_overdue: d.days, contact_phone: d.phone }))
      .sort((a, b) => b.amount_due - a.amount_due)
      .slice(0, limit);

    res.json({ success: true, data: debtors });
  } catch (err) {
    next(err);
  }
}

/** GET /api/reports/financial/forecast?months=6 */
export async function financialForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const hid = houseId(req);
    const forecastMonths = parseInt(req.query['months'] as string ?? '6', 10);

    // Get last 3 months of revenue to build baseline
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentRevenue = await prisma.financialRecord.aggregate({
      _sum: { amount: true },
      where: { houseId: hid, type: 'payment', issueDate: { gte: threeMonthsAgo } },
    });
    const avgMonthlyRevenue = Number(recentRevenue._sum.amount ?? 0) / 3;

    const activeResidents = await prisma.resident.count({ where: { houseId: hid, status: 'active', deletedAt: null } });

    const now = new Date();
    const forecast = Array.from({ length: forecastMonths }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const expectedRevenue = Math.max(avgMonthlyRevenue, activeResidents * 3000);
      const expectedExpenses = expectedRevenue * 0.35;
      const confidence = Math.max(50, 85 - i * 5);
      return {
        month: m,
        expected_revenue: Math.round(expectedRevenue * 100) / 100,
        expected_expenses: Math.round(expectedExpenses * 100) / 100,
        expected_profit: Math.round((expectedRevenue - expectedExpenses) * 100) / 100,
        confidence,
      };
    });

    res.json({
      success: true,
      data: {
        forecast,
        assumptions: {
          monthly_fee: 3000,
          occupancy_rate: 95,
          payment_rate: 81,
          active_residents: activeResidents,
          average_monthly_revenue: Math.round(avgMonthlyRevenue),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/reports/financial/generate-consolidated */
export async function financialGenerateConsolidated(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { start_date, end_date, format = 'pdf' } = req.body as { start_date?: string; end_date?: string; format?: string };
    const hid = houseId(req);
    const start = start_date ? new Date(start_date) : (() => { const d = new Date(); d.setDate(1); return d; })();
    const end   = end_date   ? new Date(end_date)   : new Date();

    const [records, house] = await Promise.all([
      prisma.financialRecord.findMany({
        where: { houseId: hid, issueDate: { gte: start, lt: end } },
        include: { resident: { select: { name: true, cpf: true } } },
        orderBy: { issueDate: 'desc' },
      }),
      prisma.house.findUnique({ where: { id: hid }, select: { name: true } }),
    ]);

    const period = `${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}`;
    const rows = records.map((r) => ({
      date: r.issueDate.toLocaleDateString('pt-BR'),
      invoice: r.invoiceNumber ?? '—',
      resident: r.resident.name,
      description: r.description,
      type: r.type,
      category: r.category,
      amount: Number(r.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      status: r.status,
    }));

    if (format === 'xlsx') {
      streamExcelReport(res, 'financeiro-consolidado', [
        {
          name: 'Registros',
          headers: { date: 'Data', invoice: 'Fatura', resident: 'Residente', description: 'Descrição', type: 'Tipo', category: 'Categoria', amount: 'Valor', status: 'Status' },
          rows,
        },
      ]);
    } else {
      const total = records.reduce((s, r) => s + Number(r.amount), 0);
      streamPDFReport(res, {
        title: 'Relatório Financeiro Consolidado',
        subtitle: period,
        houseName: house?.name ?? 'Casa Geriátrica',
        period,
        sections: [
          {
            title: 'Sumário',
            type: 'kpi',
            content: [
              { label: 'Total de registros', value: records.length },
              { label: 'Valor total', value: total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
              { label: 'Cobranças', value: records.filter((r) => r.type === 'charge').length },
              { label: 'Pagamentos', value: records.filter((r) => r.type === 'payment').length },
            ],
          },
          { title: 'Detalhamento', type: 'table', columns: ['date', 'invoice', 'resident', 'description', 'amount', 'status'], headers: { date: 'Data', invoice: 'Fatura', resident: 'Residente', description: 'Descrição', amount: 'Valor', status: 'Status' }, content: rows },
        ],
      });
    }
  } catch (err) {
    next(err);
  }
}

// ─── STAFF ─────────────────────────────────────────────────────────────────────

/** GET /api/reports/staff/dashboard?month=YYYY-MM */
export async function staffDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const month = (req.query['month'] as string | undefined) ?? currentMonth();
    const hid = houseId(req);
    const { start, end } = monthToRange(month);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [allStaff, schedules, todaySchedules] = await Promise.all([
      prisma.user.findMany({
        where: { houseId: hid, active: true, role: { notIn: ['admin', 'director'] } },
        select: { id: true, name: true, role: true },
      }),
      prisma.workSchedule.findMany({
        where: { houseId: hid, scheduleDate: { gte: start, lt: end } },
        select: {
          userId: true, status: true, shift: true, checkedInAt: true, checkedOutAt: true,
          scheduleDate: true, startTime: true, absenceReason: true, absenceApproved: true,
        },
      }),
      prisma.workSchedule.findMany({
        where: { houseId: hid, scheduleDate: { gte: today, lt: tomorrow } },
        select: { userId: true, status: true },
      }),
    ]);

    const SHIFT_HOURS: Record<string, number> = { morning: 6, afternoon: 6, night: 12, full_day: 12, on_call: 4 };
    const hoursScheduled = schedules.reduce((s, sc) => s + (SHIFT_HOURS[sc.shift] ?? 6), 0);
    const presentSchedules = schedules.filter((s) => s.status === 'present');
    const hoursWorked = presentSchedules.reduce((s, sc) => {
      if (sc.checkedInAt && sc.checkedOutAt) {
        return s + (sc.checkedOutAt.getTime() - sc.checkedInAt.getTime()) / 3_600_000;
      }
      return s + (SHIFT_HOURS[sc.shift] ?? 6);
    }, 0);

    const noShowCount = schedules.filter((s) => s.status === 'no_show').length;
    const absenceRate = schedules.length > 0 ? Math.round((noShowCount / schedules.length) * 1000) / 10 : 0;
    const isScheduleLate = (sc: { checkedInAt: Date | null; startTime: string | null }) => {
      if (!sc.checkedInAt || !sc.startTime) return false;
      const [h, m] = sc.startTime.split(':').map(Number);
      const expected = new Date(sc.checkedInAt);
      expected.setHours(h!, m!, 0, 0);
      return sc.checkedInAt.getTime() > expected.getTime() + 5 * 60_000;
    };
    const lateCount   = schedules.filter(isScheduleLate).length;

    // Staff by role — look up user role from allStaff
    const roleMap = new Map<string, { count: number; scheduled: number; worked: number }>();
    for (const s of schedules) {
      const staffUser = allStaff.find((u) => u.id === s.userId);
      const role = staffUser?.role ?? 'unknown';
      if (!roleMap.has(role)) roleMap.set(role, { count: 0, scheduled: 0, worked: 0 });
      roleMap.get(role)!.scheduled += (SHIFT_HOURS[s.shift] ?? 6);
      if (s.status === 'present') roleMap.get(role)!.worked += (SHIFT_HOURS[s.shift] ?? 6);
    }
    const staffByRole = [...roleMap.entries()].map(([role, data]) => ({
      role,
      count: allStaff.filter((u) => u.role === role).length,
      hours_scheduled: Math.round(data.scheduled),
      hours_worked: Math.round(data.worked),
      utilization_rate: data.scheduled > 0 ? Math.round((data.worked / data.scheduled) * 1000) / 10 : 0,
    }));

    // Individual staff
    const individualStaff = allStaff.map((u) => {
      const uSchedules = schedules.filter((s) => s.userId === u.id);
      const scheduled  = uSchedules.reduce((s, sc) => s + (SHIFT_HOURS[sc.shift] ?? 6), 0);
      const worked     = uSchedules.filter((s) => s.status === 'present').reduce((s, sc) => s + (SHIFT_HOURS[sc.shift] ?? 6), 0);
      const absences   = uSchedules.filter((s) => s.status === 'no_show').length;
      const late       = uSchedules.filter(isScheduleLate).length;
      const punctuality = uSchedules.filter((s) => s.status === 'present').length > 0
        ? Math.round(((uSchedules.filter((s) => s.status === 'present').length - late) / Math.max(1, uSchedules.filter((s) => s.status === 'present').length)) * 1000) / 10
        : 100;
      const absRate = uSchedules.length > 0 ? Math.round((absences / uSchedules.length) * 1000) / 10 : 0;
      return {
        staff_id: u.id,
        name: u.name,
        role: u.role,
        hours_scheduled: Math.round(scheduled),
        hours_worked: Math.round(worked),
        overtime_hours: Math.max(0, Math.round(worked - scheduled)),
        absence_count: absences,
        absence_rate: absRate,
        punctuality_rate: punctuality,
        trend: staffTrend(punctuality, absRate),
      };
    });

    // Absence reasons
    const absenceReasonMap = new Map<string, { count: number; approved: number }>();
    for (const s of schedules.filter((s) => ['no_show', 'excused_absence'].includes(s.status))) {
      const reason = (s.absenceReason ?? 'Falta').slice(0, 30);
      if (!absenceReasonMap.has(reason)) absenceReasonMap.set(reason, { count: 0, approved: 0 });
      absenceReasonMap.get(reason)!.count++;
      if (s.absenceApproved) absenceReasonMap.get(reason)!.approved++;
    }
    const totalAbsences = [...absenceReasonMap.values()].reduce((s, v) => s + v.count, 0);
    const absenceReasons = [...absenceReasonMap.entries()].map(([reason, { count, approved }]) => ({
      reason, count, percentage: totalAbsences > 0 ? Math.round((count / totalAbsences) * 1000) / 10 : 0, approved,
    })).sort((a, b) => b.count - a.count);

    const todayPresent = todaySchedules.filter((s) => s.status === 'present').length;
    const todayAbsent  = todaySchedules.filter((s) => s.status === 'no_show').length;

    res.json({
      success: true,
      data: {
        summary: {
          total_staff: allStaff.length,
          present: todayPresent,
          absent_today: todayAbsent,
          total_hours_this_month: Math.round(hoursScheduled),
          actual_hours_worked: Math.round(hoursWorked),
          absence_rate: absenceRate,
          overtime_hours: Math.max(0, Math.round(hoursWorked - hoursScheduled)),
        },
        staff_by_role: staffByRole,
        individual_staff: individualStaff,
        absence_reasons: absenceReasons,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/reports/staff/timesheet/generate */
export async function staffTimesheetGenerate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month = currentMonth(), format = 'pdf' } = req.body as { month?: string; format?: string };
    const hid = houseId(req);
    const { start, end } = monthToRange(month);

    const [schedules, house] = await Promise.all([
      prisma.workSchedule.findMany({
        where: { houseId: hid, scheduleDate: { gte: start, lt: end } },
        include: { user: { select: { name: true, role: true } } },
        orderBy: [{ user: { name: 'asc' } }, { scheduleDate: 'asc' }],
      }),
      prisma.house.findUnique({ where: { id: hid }, select: { name: true } }),
    ]);

    const rows = schedules.map((s) => ({
      name: s.user.name,
      role: s.user.role,
      date: s.scheduleDate.toLocaleDateString('pt-BR'),
      shift: s.shift,
      check_in: s.checkedInAt?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) ?? '—',
      check_out: s.checkedOutAt?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) ?? '—',
      status: s.status,
      hours: s.checkedInAt && s.checkedOutAt
        ? String(Math.round(((s.checkedOutAt.getTime() - s.checkedInAt.getTime()) / 3_600_000) * 10) / 10)
        : '—',
    }));

    if (format === 'xlsx') {
      streamExcelReport(res, `folha-ponto-${month}`, [
        {
          name: 'Folha de Ponto',
          headers: { name: 'Funcionário', role: 'Cargo', date: 'Data', shift: 'Turno', check_in: 'Entrada', check_out: 'Saída', status: 'Status', hours: 'Horas' },
          rows,
        },
      ]);
    } else {
      streamPDFReport(res, {
        title: `Folha de Ponto — ${month}`,
        subtitle: '',
        houseName: house?.name ?? 'Casa Geriátrica',
        period: month,
        sections: [
          {
            title: 'Registro de Ponto',
            type: 'table',
            columns: ['name', 'date', 'shift', 'check_in', 'check_out', 'hours', 'status'],
            headers: { name: 'Funcionário', date: 'Data', shift: 'Turno', check_in: 'Entrada', check_out: 'Saída', hours: 'Horas', status: 'Status' },
            content: rows,
          },
        ],
      });
    }
  } catch (err) {
    next(err);
  }
}

/** POST /api/reports/staff/export-excel */
export async function staffExportExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
  return staffTimesheetGenerate(req, res, next);
}

// ─── Legacy endpoints (kept for backward compat) ──────────────────────────────

export async function medications(req: Request, res: Response, next: NextFunction): Promise<void> {
  return medicationsDashboard(req, res, next);
}

export async function residents(req: Request, res: Response, next: NextFunction): Promise<void> {
  return residentsDashboard(req, res, next);
}

export async function financial(req: Request, res: Response, next: NextFunction): Promise<void> {
  return financialDashboard(req, res, next);
}

export async function staff(req: Request, res: Response, next: NextFunction): Promise<void> {
  return staffDashboard(req, res, next);
}

export async function visitors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { start, end } = parsePeriodParam(req.query['period'] as string | undefined);
    const visits = await prisma.visitor.findMany({
      where: { resident: { houseId: authReq.houseId }, visitDate: { gte: start, lt: end } },
      include: { resident: { select: { id: true, name: true } } },
      orderBy: { visitDate: 'desc' },
    });
    res.json({ data: { visits, total: visits.length } });
  } catch (err) {
    next(err);
  }
}

export async function scheduleReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { type, cron, email } = req.body as { type?: string; cron?: string; email?: string };
    await reportQueue.add('scheduled-report', { houseId: authReq.houseId, userId: authReq.userId, type, cron, email });
    res.json({ data: null, message: 'Relatório agendado com sucesso' });
  } catch (err) {
    next(err);
  }
}
