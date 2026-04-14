import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import { sendSms, sendWhatsApp, sendEmail } from '../services/notifications.service.js';
import { logger } from '../lib/logger.js';

// ─── Validation schemas ────────────────────────────────────────────────────────

const CreateFinancialSchema = z.object({
  resident_id: z.string().uuid(),
  type: z.enum(['charge', 'payment', 'refund', 'adjustment', 'fine']),
  amount: z.number().positive('Valor deve ser positivo').max(1_000_000, 'Valor muito alto'),
  original_amount: z.number().positive().optional(),
  description: z.string().min(5, 'Descrição mínima de 5 caracteres').max(500),
  category: z.enum(['monthly_fee', 'medicine', 'supplies', 'extra_service', 'other']).optional().default('monthly_fee'),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paid_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  payment_method: z.enum(['cash', 'check', 'bank_transfer', 'credit_card', 'debit_card', 'pix', 'boleto', 'other']).optional(),
  bank_account: z.string().max(50).optional(),
  check_number: z.string().max(20).optional(),
  reference_month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).optional(),
  attachment_url: z.string().url().optional(),
});

const UpdateFinancialSchema = CreateFinancialSchema.partial().extend({
  status: z.enum(['pending', 'paid', 'overdue', 'partially_paid', 'canceled', 'disputed']).optional(),
});

const SendReminderSchema = z.object({
  channels: z.array(z.enum(['sms', 'whatsapp', 'email'])).optional().default(['sms', 'whatsapp']),
  message_template: z.string().optional().default('default'),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function shouldMarkOverdue(record: { due_date: Date; status: string }): boolean {
  return (
    record.due_date < new Date() &&
    ['pending', 'partially_paid'].includes(record.status)
  );
}

export function calculatePaymentRate(records: { type: string; status: string }[]): number {
  const charges = records.filter((r) => r.type === 'charge');
  if (charges.length === 0) return 0;
  const paid = charges.filter((r) => r.status === 'paid').length;
  return Math.round((paid / charges.length) * 100);
}

async function generateInvoiceNumber(houseId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.financialRecord.count({
    where: { houseId, createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `FAT-${year}-${String(count + 1).padStart(4, '0')}`;
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

/** GET /api/financial/resident/:id */
export async function listByResident(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const months = Number(req.query['months'] ?? 3);
    const statusFilter = req.query['status'] as string | undefined;

    const resident = await prisma.resident.findFirst({
      where: { id: req.params['residentId'] ?? req.params['id'], houseId: authReq.houseId, deletedAt: null },
      select: { id: true, name: true, cpf: true },
    });
    if (!resident) throw new AppError(404, 'Residente não encontrado');

    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const where = {
      residentId: resident.id,
      createdAt: { gte: since },
      ...(statusFilter && statusFilter !== 'all' ? { status: statusFilter as 'pending' | 'paid' | 'overdue' | 'partially_paid' | 'canceled' | 'disputed' } : {}),
    };

    const records = await prisma.financialRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const enriched = records.map((r) => ({
      ...r,
      days_overdue: r.dueDate && r.status === 'overdue'
        ? Math.floor((now.getTime() - r.dueDate.getTime()) / 86_400_000)
        : 0,
    }));

    const charges = records.filter((r) => r.type === 'charge');
    const payments = records.filter((r) => r.type === 'payment');
    const summary = {
      total_charges:  charges.reduce((s, r) => s + Number(r.amount), 0),
      total_paid:     payments.reduce((s, r) => s + Number(r.amount), 0),
      total_pending:  charges.filter((r) => r.status === 'pending').reduce((s, r) => s + Number(r.amount), 0),
      total_overdue:  charges.filter((r) => r.status === 'overdue').reduce((s, r) => s + Number(r.amount), 0),
      payment_rate:   calculatePaymentRate(records),
    };

    res.json({ success: true, data: { resident, records: enriched, summary } });
  } catch (err) {
    next(err);
  }
}

/** POST /api/financial */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const parsed = CreateFinancialSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'Dados inválidos');

    const {
      resident_id, type, amount, original_amount, description, category,
      issue_date, due_date, paid_date, payment_method, bank_account,
      check_number, reference_month, notes, attachment_url,
    } = parsed.data;

    const resident = await prisma.resident.findFirst({
      where: { id: resident_id, houseId: authReq.houseId, deletedAt: null },
    });
    if (!resident) throw new AppError(404, 'Residente não encontrado');

    const invoiceNumber = await generateInvoiceNumber(authReq.houseId);

    // Auto-determine status
    let status: 'pending' | 'paid' | 'overdue' = 'pending';
    if (type === 'payment') status = 'paid';
    else if (due_date && new Date(due_date) < new Date()) status = 'overdue';

    const record = await prisma.financialRecord.create({
      data: {
        residentId:     resident_id,
        houseId:        authReq.houseId,
        type:           type,
        amount,
        originalAmount: original_amount,
        description,
        category:       category,
        issueDate:      new Date(issue_date),
        dueDate:        due_date ? new Date(due_date) : undefined,
        paidDate:       paid_date ? new Date(paid_date) : undefined,
        paymentMethod:  payment_method,
        bankAccount:    bank_account,
        checkNumber:    check_number,
        referenceMonth: reference_month ? new Date(reference_month) : undefined,
        invoiceNumber,
        status,
        notes,
        attachmentUrl:  attachment_url,
        createdBy:      authReq.userId,
      },
    });

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/financial/:id */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const existing = await prisma.financialRecord.findFirst({
      where: { id: req.params['id'], houseId: authReq.houseId },
    });
    if (!existing) throw new AppError(404, 'Registro financeiro não encontrado');
    if (existing.status === 'canceled') throw new AppError(400, 'Registro cancelado não pode ser editado');

    const parsed = UpdateFinancialSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'Dados inválidos');

    const data = parsed.data;
    const updated = await prisma.financialRecord.update({
      where: { id: existing.id },
      data: {
        ...(data.amount !== undefined        && { amount: data.amount }),
        ...(data.description !== undefined   && { description: data.description }),
        ...(data.status !== undefined        && { status: data.status }),
        ...(data.due_date !== undefined      && { dueDate: new Date(data.due_date) }),
        ...(data.paid_date !== undefined     && { paidDate: new Date(data.paid_date) }),
        ...(data.payment_method !== undefined && { paymentMethod: data.payment_method }),
        ...(data.notes !== undefined         && { notes: data.notes }),
        updatedBy: authReq.userId,
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/financial/:id (soft cancel) */
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const existing = await prisma.financialRecord.findFirst({
      where: { id: req.params['id'], houseId: authReq.houseId },
    });
    if (!existing) throw new AppError(404, 'Registro financeiro não encontrado');

    await prisma.financialRecord.update({
      where: { id: existing.id },
      data: { status: 'canceled', updatedBy: authReq.userId },
    });
    res.json({ success: true, message: 'Registro cancelado' });
  } catch (err) {
    next(err);
  }
}

/** GET /api/financial/summary */
export async function summary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [allRecords, overdueRecords, topDebtorsRaw, lastMonthPayments] = await Promise.all([
      prisma.financialRecord.findMany({
        where: { houseId: authReq.houseId, status: { not: 'canceled' } },
        select: { type: true, amount: true, status: true, residentId: true, dueDate: true, referenceMonth: true, paidDate: true },
      }),
      prisma.financialRecord.findMany({
        where: { houseId: authReq.houseId, status: 'overdue', type: 'charge' },
        include: { resident: { select: { id: true, name: true } } },
        orderBy: { amount: 'desc' },
        take: 10,
      }),
      prisma.financialRecord.groupBy({
        by: ['residentId'],
        where: { houseId: authReq.houseId, type: 'charge', status: 'overdue' },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),
      prisma.financialRecord.aggregate({
        where: {
          houseId: authReq.houseId,
          type: 'payment',
          paidDate: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    const monthCharges = allRecords.filter(
      (r) => r.type === 'charge' && r.referenceMonth && r.referenceMonth >= startOfMonth,
    );
    const monthPayments = allRecords.filter(
      (r) => r.type === 'payment' && r.paidDate && r.paidDate >= startOfMonth,
    );

    const pendingAmount = allRecords
      .filter((r) => r.type === 'charge' && r.status === 'pending')
      .reduce((s, r) => s + Number(r.amount), 0);
    const overdueAmount = allRecords
      .filter((r) => r.type === 'charge' && r.status === 'overdue')
      .reduce((s, r) => s + Number(r.amount), 0);
    const receivedThisMonth = monthPayments.reduce((s, r) => s + Number(r.amount), 0);
    const monthlyRevenue = monthCharges.reduce((s, r) => s + Number(r.amount), 0);
    const paymentRate = calculatePaymentRate(allRecords);
    const lastMonthTotal = Number(lastMonthPayments._sum.amount ?? 0);

    // Enrich top debtors with names
    const topDebtorsEnriched = await Promise.all(
      topDebtorsRaw.map(async (td) => {
        const resident = await prisma.resident.findUnique({
          where: { id: td.residentId },
          select: { name: true },
        });
        const overdueDays = overdueRecords
          .filter((r) => r.residentId === td.residentId && r.dueDate)
          .reduce((max, r) => {
            const days = Math.floor((now.getTime() - (r.dueDate?.getTime() ?? 0)) / 86_400_000);
            return Math.max(max, days);
          }, 0);
        return {
          resident_name:  resident?.name ?? 'Desconhecido',
          amount_overdue: Number(td._sum.amount ?? 0),
          days_overdue:   overdueDays,
        };
      }),
    );

    res.json({
      success: true,
      data: {
        month:                    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        residents_with_charges:   new Set(allRecords.filter((r) => r.type === 'charge').map((r) => r.residentId)).size,
        pending_amount:           pendingAmount,
        overdue_amount:           overdueAmount,
        received_this_month:      receivedThisMonth,
        monthly_revenue:          monthlyRevenue,
        payment_rate:             paymentRate,
        top_debtors:              topDebtorsEnriched,
        cash_flow: {
          this_month:  receivedThisMonth,
          last_month:  lastMonthTotal,
          trend:       receivedThisMonth >= lastMonthTotal ? 'up' : 'down',
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/financial/:id/generate-nfe */
export async function generateNfe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const record = await prisma.financialRecord.findFirst({
      where: { id: req.params['id'], houseId: authReq.houseId },
      include: {
        resident: { select: { name: true, cpf: true, phone: true, email: true } },
      },
    });
    if (!record) throw new AppError(404, 'Registro não encontrado');
    if (record.type !== 'charge') throw new AppError(400, 'NF-e só pode ser gerada para cobranças');
    if (record.nfeNumber) throw new AppError(400, 'NF-e já emitida para este registro');

    const house = await prisma.house.findUnique({ where: { id: authReq.houseId } });
    if (!house) throw new AppError(404, 'Casa não encontrada');

    // Generate sequential NF-e number
    const nfeCount = await prisma.financialRecord.count({
      where: { houseId: authReq.houseId, nfeNumber: { not: null } },
    });
    const nfeNumber = String(nfeCount + 1).padStart(18, '0');
    const nfeSeries = '1';
    const now = new Date();

    await prisma.financialRecord.update({
      where: { id: record.id },
      data: {
        nfeNumber,
        nfeSeries,
        nfeIssuedAt: now,
        updatedBy:   authReq.userId,
      },
    });

    logger.info({ recordId: record.id, nfeNumber }, 'NF-e generated');

    // TODO: integrate with actual NF-e provider (Focus NFe, eNotas)
    res.json({
      success: true,
      data: {
        nfe_number:   nfeNumber,
        nfe_series:   nfeSeries,
        nfe_issued_at: now.toISOString(),
        prestador: { name: house.name, address: house.address, city: house.city },
        tomador:   { name: record.resident.name, cpf: record.resident.cpf },
        amount:    Number(record.amount),
        description: record.description,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/financial/:id/send-reminder */
export async function sendReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const parsed = SendReminderSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'Dados inválidos');

    const record = await prisma.financialRecord.findFirst({
      where: { id: req.params['id'], houseId: authReq.houseId },
      include: {
        resident: { select: { name: true, phone: true, email: true, emergencyContactPhone: true } },
      },
    });
    if (!record) throw new AppError(404, 'Registro não encontrado');
    if (record.type !== 'charge') throw new AppError(400, 'Lembretes só podem ser enviados para cobranças');

    const { channels } = parsed.data;
    const phone = record.resident.phone ?? record.resident.emergencyContactPhone;
    const daysOverdue = record.dueDate
      ? Math.floor((Date.now() - record.dueDate.getTime()) / 86_400_000)
      : 0;

    const message = daysOverdue > 0
      ? `Olá! Identificamos um pagamento em atraso de R$ ${Number(record.amount).toFixed(2)} ` +
        `referente a "${record.description}" para ${record.resident.name}. ` +
        `Vencimento: ${record.dueDate?.toLocaleDateString('pt-BR')} (${daysOverdue} dias em atraso). ` +
        `Entre em contato para regularizar.`
      : `Lembrete: pagamento de R$ ${Number(record.amount).toFixed(2)} ` +
        `referente a "${record.description}" vence em ${record.dueDate?.toLocaleDateString('pt-BR')}.`;

    const sent: string[] = [];

    if (channels.includes('sms') && phone) {
      await sendSms(phone, message).catch((err: unknown) => logger.warn({ err }, 'SMS reminder failed'));
      sent.push('sms');
    }
    if (channels.includes('whatsapp') && phone) {
      await sendWhatsApp(phone, message).catch((err: unknown) => logger.warn({ err }, 'WhatsApp reminder failed'));
      sent.push('whatsapp');
    }
    if (channels.includes('email') && record.resident.email) {
      await sendEmail(
        record.resident.email,
        `Lembrete de pagamento — ${record.description}`,
        `<p>${message.replace(/\n/g, '<br>')}</p>`,
      ).catch((err: unknown) => logger.warn({ err }, 'Email reminder failed'));
      sent.push('email');
    }

    res.json({
      success: true,
      data: {
        message:       `Notificação enviada para ${record.resident.name}`,
        channels_sent: sent,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/financial/report */
export async function report(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { period } = req.query;

    let dateFilter = {};
    if (period) {
      const [year, mon] = (period as string).split('-');
      const start = new Date(`${year}-${mon}-01`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      dateFilter = { dueDate: { gte: start, lt: end } };
    }

    const records = await prisma.financialRecord.findMany({
      where: { houseId: authReq.houseId, ...dateFilter },
      include: { resident: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const total = {
      charges:  records.filter((r) => r.type === 'charge').reduce((s, r) => s + Number(r.amount), 0),
      payments: records.filter((r) => r.type === 'payment').reduce((s, r) => s + Number(r.amount), 0),
      overdue:  records.filter((r) => r.status === 'overdue').reduce((s, r) => s + Number(r.amount), 0),
      overdue_count: records.filter((r) => r.status === 'overdue').length,
    };

    res.json({ success: true, data: { records, summary: total } });
  } catch (err) {
    next(err);
  }
}
