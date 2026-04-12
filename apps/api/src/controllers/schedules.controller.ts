import type { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import { notificationQueue } from '../jobs/queues.js';

const scheduleSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  date: Joi.string().isoDate().required(),
  shift: Joi.string().valid('morning', 'afternoon', 'night', 'full_day').required(),
  startTime: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
  endTime: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
  confirmed: Joi.boolean().default(false),
  notes: Joi.string().optional(),
});

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { month } = req.query; // e.g., '2026-05'

    let dateFilter = {};
    if (month) {
      const [year, mon] = (month as string).split('-');
      const start = new Date(`${year}-${mon}-01`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      dateFilter = { date: { gte: start, lt: end } };
    }

    const schedules = await prisma.workSchedule.findMany({
      where: { houseId: authReq.houseId, ...dateFilter },
      include: { user: { select: { id: true, name: true, role: true, phone: true } } },
      orderBy: [{ date: 'asc' }, { shift: 'asc' }],
    });
    res.json({ data: schedules });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;

    // Support batch creation
    const entries = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];

    for (const entry of entries) {
      const { error, value } = scheduleSchema.validate(entry);
      if (error) throw new AppError(400, error.message);

      // Verify user belongs to this house
      const user = await prisma.user.findFirst({
        where: { id: value.userId as string, houseId: authReq.houseId, active: true },
      });
      if (!user) throw new AppError(404, `Funcionário ${value.userId as string} não encontrado`);

      const schedule = await prisma.workSchedule.upsert({
        where: { userId_date_shift: { userId: value.userId as string, date: new Date(value.date as string), shift: value.shift as 'morning' | 'afternoon' | 'night' | 'full_day' } },
        create: { ...value, date: new Date(value.date as string), houseId: authReq.houseId },
        update: { ...value, date: new Date(value.date as string) },
        include: { user: { select: { id: true, name: true, phone: true } } },
      });
      results.push(schedule);

      // Notify employee
      await notificationQueue.add('schedule-created', {
        userId: user.id,
        userName: user.name,
        date: value.date,
        shift: value.shift,
        houseId: authReq.houseId,
      });
    }

    res.status(201).json({ data: results });
  } catch (err) {
    next(err);
  }
}

export async function getByUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { month } = req.query;

    let dateFilter = {};
    if (month) {
      const [year, mon] = (month as string).split('-');
      const start = new Date(`${year}-${mon}-01`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      dateFilter = { date: { gte: start, lt: end } };
    }

    const schedules = await prisma.workSchedule.findMany({
      where: { userId: req.params['userId'], houseId: authReq.houseId, ...dateFilter },
      orderBy: { date: 'asc' },
    });
    res.json({ data: schedules });
  } catch (err) {
    next(err);
  }
}

export async function confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const schedule = await prisma.workSchedule.findFirst({
      where: { id: req.params['id'], houseId: authReq.houseId },
    });
    if (!schedule) throw new AppError(404, 'Escala não encontrada');

    // Only the assigned user or admin can confirm
    if (schedule.userId !== authReq.userId && authReq.userRole !== 'admin' && authReq.userRole !== 'director') {
      throw new AppError(403, 'Sem permissão para confirmar esta escala');
    }

    const updated = await prisma.workSchedule.update({
      where: { id: schedule.id },
      data: { confirmed: true },
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const schedule = await prisma.workSchedule.findFirst({
      where: { id: req.params['id'], houseId: authReq.houseId },
    });
    if (!schedule) throw new AppError(404, 'Escala não encontrada');

    await prisma.workSchedule.delete({ where: { id: schedule.id } });
    res.json({ data: null, message: 'Escala removida' });
  } catch (err) {
    next(err);
  }
}
