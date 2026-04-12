import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';
import { reportQueue } from '../jobs/queues.js';

function parsePeriod(period?: string): { start: Date; end: Date } {
  if (period) {
    const [year, mon] = period.split('-');
    const start = new Date(`${year}-${mon}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    return { start, end };
  }
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { start, end };
}

export async function medications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { start, end } = parsePeriod(req.query['period'] as string | undefined);

    const logs = await prisma.medicationLog.findMany({
      where: {
        resident: { houseId: authReq.houseId },
        administeredAt: { gte: start, lt: end },
      },
      include: {
        medication: { select: { name: true, dosage: true } },
        resident: { select: { id: true, name: true } },
        administratedBy: { select: { id: true, name: true } },
      },
      orderBy: { administeredAt: 'desc' },
    });

    const summary = {
      total: logs.length,
      administered: logs.filter((l) => l.status === 'administered').length,
      refused: logs.filter((l) => l.status === 'refused').length,
      missed: logs.filter((l) => l.status === 'missed').length,
      delayed: logs.filter((l) => l.status === 'delayed').length,
    };

    res.json({ data: { logs, summary } });
  } catch (err) {
    next(err);
  }
}

export async function residents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const [allResidents, expiringDocuments] = await Promise.all([
      prisma.resident.findMany({
        where: { houseId: authReq.houseId, deletedAt: null },
        select: { id: true, name: true, status: true, admissionDate: true, birthDate: true },
      }),
      prisma.document.findMany({
        where: {
          resident: { houseId: authReq.houseId, deletedAt: null },
          expiresAt: { lte: sevenDaysFromNow },
        },
        include: { resident: { select: { id: true, name: true } } },
      }),
    ]);

    res.json({
      data: {
        residents: allResidents,
        expiringDocuments,
        summary: {
          total: allResidents.length,
          active: allResidents.filter((r) => r.status === 'active').length,
          inactive: allResidents.filter((r) => r.status === 'inactive').length,
          discharged: allResidents.filter((r) => r.status === 'discharged').length,
          documentsExpiringSoon: expiringDocuments.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function financial(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { start, end } = parsePeriod(req.query['period'] as string | undefined);

    const records = await prisma.financialRecord.findMany({
      where: { houseId: authReq.houseId, createdAt: { gte: start, lt: end } },
      include: { resident: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: { records } });
  } catch (err) {
    next(err);
  }
}

export async function staff(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { start, end } = parsePeriod(req.query['period'] as string | undefined);

    const schedules = await prisma.workSchedule.findMany({
      where: { houseId: authReq.houseId, date: { gte: start, lt: end } },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { date: 'asc' },
    });

    res.json({ data: { schedules } });
  } catch (err) {
    next(err);
  }
}

export async function visitors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { start, end } = parsePeriod(req.query['period'] as string | undefined);

    const visits = await prisma.visitor.findMany({
      where: {
        resident: { houseId: authReq.houseId },
        visitDate: { gte: start, lt: end },
      },
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

    await reportQueue.add('scheduled-report', {
      houseId: authReq.houseId,
      userId: authReq.userId,
      type,
      cron,
      email,
    });

    res.json({ data: null, message: 'Relatório agendado com sucesso' });
  } catch (err) {
    next(err);
  }
}
