import type { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';

const recordSchema = Joi.object({
  residentId: Joi.string().uuid().required(),
  type: Joi.string().valid('charge', 'payment', 'refund', 'adjustment').required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().optional(),
  dueDate: Joi.string().isoDate().optional(),
  paidDate: Joi.string().isoDate().optional(),
  paymentMethod: Joi.string()
    .valid('cash', 'check', 'bank_transfer', 'credit_card', 'other')
    .optional(),
  invoiceNumber: Joi.string().optional(),
  status: Joi.string().valid('pending', 'paid', 'overdue', 'canceled').default('pending'),
  notes: Joi.string().optional(),
});

export async function listByResident(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const resident = await prisma.resident.findFirst({
      where: { id: req.params['residentId'], houseId: authReq.houseId, deletedAt: null },
    });
    if (!resident) throw new AppError(404, 'Residente não encontrado');

    const records = await prisma.financialRecord.findMany({
      where: { residentId: resident.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: records });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { error, value } = recordSchema.validate(req.body);
    if (error) throw new AppError(400, error.message);

    const resident = await prisma.resident.findFirst({
      where: { id: value.residentId as string, houseId: authReq.houseId, deletedAt: null },
    });
    if (!resident) throw new AppError(404, 'Residente não encontrado');

    const record = await prisma.financialRecord.create({
      data: {
        ...value,
        houseId: authReq.houseId,
        dueDate: value.dueDate ? new Date(value.dueDate as string) : undefined,
        paidDate: value.paidDate ? new Date(value.paidDate as string) : undefined,
      },
    });
    res.status(201).json({ data: record });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const existing = await prisma.financialRecord.findFirst({
      where: { id: req.params['id'], houseId: authReq.houseId },
    });
    if (!existing) throw new AppError(404, 'Registro financeiro não encontrado');

    const { error, value } = recordSchema.validate(req.body);
    if (error) throw new AppError(400, error.message);

    const updated = await prisma.financialRecord.update({
      where: { id: existing.id },
      data: {
        ...value,
        dueDate: value.dueDate ? new Date(value.dueDate as string) : undefined,
        paidDate: value.paidDate ? new Date(value.paidDate as string) : undefined,
      },
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const existing = await prisma.financialRecord.findFirst({
      where: { id: req.params['id'], houseId: authReq.houseId },
    });
    if (!existing) throw new AppError(404, 'Registro financeiro não encontrado');

    await prisma.financialRecord.update({
      where: { id: existing.id },
      data: { status: 'canceled' },
    });
    res.json({ data: null, message: 'Registro cancelado' });
  } catch (err) {
    next(err);
  }
}

export async function generateNfe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { residentId, period } = req.query; // period: '2026-04'

    if (!residentId || !period) throw new AppError(400, 'residentId e period são obrigatórios');

    const [year, month] = (period as string).split('-');
    const start = new Date(`${year}-${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const resident = await prisma.resident.findFirst({
      where: { id: residentId as string, houseId: authReq.houseId, deletedAt: null },
    });
    if (!resident) throw new AppError(404, 'Residente não encontrado');

    const house = await prisma.house.findUnique({ where: { id: authReq.houseId } });
    if (!house) throw new AppError(404, 'Casa não encontrada');

    const charges = await prisma.financialRecord.findMany({
      where: {
        residentId: residentId as string,
        houseId: authReq.houseId,
        type: 'charge',
        status: { not: 'canceled' },
        dueDate: { gte: start, lt: end },
      },
    });

    const total = charges.reduce((sum, r) => sum + Number(r.amount), 0);

    // NF-e data payload (to be sent to NF-e provider API)
    const nfePayload = {
      prestador: {
        name: house.name,
        email: house.email,
        phone: house.phone,
        address: house.address,
        city: house.city,
        state: house.state,
      },
      tomador: {
        name: resident.name,
        cpf: resident.cpf,
        phone: resident.phone,
        email: resident.email,
      },
      items: charges.map((c) => ({
        description: c.description ?? 'Serviços de hospedagem e cuidados',
        amount: Number(c.amount),
      })),
      total,
      period: period as string,
      competencia: `${month}/${year}`,
    };

    // TODO: Integrate with NF-e provider (e.g. Focus NFe, eNotas)
    // For now, return the payload for review
    res.json({ data: nfePayload, message: 'NF-e preparada para emissão' });
  } catch (err) {
    next(err);
  }
}

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

    const summary = {
      totalCharges: records.filter((r) => r.type === 'charge').reduce((s, r) => s + Number(r.amount), 0),
      totalPayments: records.filter((r) => r.type === 'payment').reduce((s, r) => s + Number(r.amount), 0),
      totalOverdue: records.filter((r) => r.status === 'overdue').reduce((s, r) => s + Number(r.amount), 0),
      overdueCases: records.filter((r) => r.status === 'overdue').length,
    };

    res.json({ data: { records, summary } });
  } catch (err) {
    next(err);
  }
}

export async function dashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [monthlyCharges, monthlyPayments, overdueRecords, totalResidents] = await Promise.all([
      prisma.financialRecord.aggregate({
        where: { houseId: authReq.houseId, type: 'charge', createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.financialRecord.aggregate({
        where: { houseId: authReq.houseId, type: 'payment', createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.financialRecord.count({
        where: { houseId: authReq.houseId, status: 'overdue' },
      }),
      prisma.resident.count({
        where: { houseId: authReq.houseId, status: 'active', deletedAt: null },
      }),
    ]);

    res.json({
      data: {
        monthlyRevenue: Number(monthlyCharges._sum.amount ?? 0),
        monthlyPayments: Number(monthlyPayments._sum.amount ?? 0),
        overdueCount: overdueRecords,
        activeResidents: totalResidents,
      },
    });
  } catch (err) {
    next(err);
  }
}
