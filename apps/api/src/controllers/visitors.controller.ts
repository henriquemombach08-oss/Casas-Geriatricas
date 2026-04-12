import type { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';

const visitorSchema = Joi.object({
  residentId: Joi.string().uuid().required(),
  name: Joi.string().min(2).required(),
  relationship: Joi.string().optional(),
  phone: Joi.string().optional(),
  email: Joi.string().email().optional(),
  visitDate: Joi.string().isoDate().required(),
  visitTimeIn: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
  visitTimeOut: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
  notes: Joi.string().optional(),
});

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { error, value } = visitorSchema.validate(req.body);
    if (error) throw new AppError(400, error.message);

    const resident = await prisma.resident.findFirst({
      where: { id: value.residentId as string, houseId: authReq.houseId, deletedAt: null },
    });
    if (!resident) throw new AppError(404, 'Residente não encontrado');

    const visitor = await prisma.visitor.create({ data: value });
    res.status(201).json({ data: visitor });
  } catch (err) {
    next(err);
  }
}

export async function listByResident(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const resident = await prisma.resident.findFirst({
      where: { id: req.params['residentId'], houseId: authReq.houseId, deletedAt: null },
    });
    if (!resident) throw new AppError(404, 'Residente não encontrado');

    const visitors = await prisma.visitor.findMany({
      where: { residentId: resident.id },
      orderBy: { visitDate: 'desc' },
    });
    res.json({ data: visitors });
  } catch (err) {
    next(err);
  }
}

export async function checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { visitTimeOut } = req.body as { visitTimeOut?: string };
    if (!visitTimeOut) throw new AppError(400, 'Horário de saída obrigatório');

    const visitor = await prisma.visitor.findFirst({
      where: { id: req.params['id'], resident: { houseId: authReq.houseId } },
    });
    if (!visitor) throw new AppError(404, 'Visita não encontrada');

    const updated = await prisma.visitor.update({
      where: { id: visitor.id },
      data: { visitTimeOut },
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

export async function listAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { date, page = 1, limit = 20 } = req.query;

    const visitors = await prisma.visitor.findMany({
      where: {
        resident: { houseId: authReq.houseId },
        ...(date ? { visitDate: new Date(date as string) } : {}),
      },
      include: {
        resident: { select: { id: true, name: true } },
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { visitDate: 'desc' },
    });
    res.json({ data: visitors });
  } catch (err) {
    next(err);
  }
}
