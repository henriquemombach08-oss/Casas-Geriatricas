import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import { notificationQueue } from '../jobs/queues.js';
import { logger } from '../lib/logger.js';

// ─── Validation schemas ────────────────────────────────────────────────────────

const SHIFT_HOURS: Record<string, { start: string; end: string }> = {
  morning:   { start: '07:00', end: '13:00' },
  afternoon: { start: '13:00', end: '19:00' },
  night:     { start: '19:00', end: '07:00' },
  full_day:  { start: '07:00', end: '19:00' },
  on_call:   { start: '00:00', end: '00:00' },
};

const ListSchedulesSchema = z.object({
  month: z.string()
    .regex(/^\d{4}-\d{2}$/, 'Formato: AAAA-MM')
    .refine((m) => {
      const [y, mo] = m.split('-').map(Number);
      return y! >= 2020 && mo! >= 1 && mo! <= 12;
    }, 'Mês inválido')
    .optional(),
  house_id: z.string().uuid().optional(),
});

const ScheduleEntrySchema = z.object({
  user_id: z.string().uuid(),
  schedule_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: AAAA-MM-DD'),
  shift: z.enum(['morning', 'afternoon', 'night', 'full_day', 'on_call']),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time:   z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notes: z.string().max(1000).optional(),
});

const CreateSchedulesSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  schedules: z.array(ScheduleEntrySchema).min(1),
});

const ConfirmScheduleSchema = z.object({
  confirmed: z.boolean(),
  notes: z.string().max(500).optional(),
});

const AbsenceSchema = z.object({
  reason: z.string().min(3).max(500),
  approved: z.boolean().optional().default(false),
  notes: z.string().max(500).optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function calculateWorkedHours(checkedIn: Date, checkedOut: Date): number {
  const diffMs = checkedOut.getTime() - checkedIn.getTime();
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
}

export function isLate(expected: Date, actual: Date, toleranceMinutes = 5): boolean {
  return actual.getTime() > expected.getTime() + toleranceMinutes * 60 * 1000;
}

function buildMonthFilter(month: string) {
  const [year, mon] = month.split('-');
  const start = new Date(`${year}-${mon}-01`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { gte: start, lt: end };
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

/** GET /api/schedules?month=YYYY-MM */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const parsed = ListSchedulesSchema.safeParse(req.query);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'Parâmetros inválidos');

    const { month } = parsed.data;
    const dateFilter = month ? { scheduleDate: buildMonthFilter(month) } : {};

    const schedules = await prisma.workSchedule.findMany({
      where: { houseId: authReq.houseId, ...dateFilter },
      include: {
        user: { select: { id: true, name: true, role: true, phone: true } },
      },
      orderBy: [{ scheduleDate: 'asc' }, { shift: 'asc' }],
    });

    const summary = {
      total_scheduled: schedules.length,
      total_confirmed: schedules.filter((s) => s.status === 'confirmed' || s.status === 'present').length,
      total_no_show:   schedules.filter((s) => s.status === 'no_show').length,
      total_present:   schedules.filter((s) => s.status === 'present').length,
    };

    res.json({
      success: true,
      data: {
        month: month ?? null,
        schedules: schedules.map((s) => ({
          ...s,
          is_late: s.checkedInAt && s.startTime
            ? isLate(
                new Date(`${s.scheduleDate.toISOString().split('T')[0]}T${s.startTime}`),
                s.checkedInAt,
              )
            : false,
          worked_hours: s.checkedInAt && s.checkedOutAt
            ? calculateWorkedHours(s.checkedInAt, s.checkedOutAt)
            : null,
        })),
        summary,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/schedules – batch create */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;

    // Accept both `{ schedules: [...] }` and plain array
    const body = Array.isArray(req.body)
      ? { schedules: req.body as unknown[] }
      : req.body;

    const parsed = CreateSchedulesSchema.safeParse(body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'Dados inválidos');

    const results = [];
    const errors: string[] = [];

    for (const entry of parsed.data.schedules) {
      // Verify user belongs to this house
      const user = await prisma.user.findFirst({
        where: { id: entry.user_id, houseId: authReq.houseId, active: true },
      });
      if (!user) {
        errors.push(`Funcionário ${entry.user_id} não encontrado nesta casa`);
        continue;
      }

      // Check for conflicts
      const existing = await prisma.workSchedule.findFirst({
        where: {
          userId: entry.user_id,
          scheduleDate: new Date(entry.schedule_date),
          shift: entry.shift,
          status: { in: ['scheduled', 'confirmed', 'present'] },
        },
      });
      if (existing) {
        errors.push(`${user.name} já está escalado para ${entry.schedule_date} (${entry.shift})`);
        continue;
      }

      const shiftDefaults = SHIFT_HOURS[entry.shift] ?? { start: '00:00', end: '00:00' };
      const schedule = await prisma.workSchedule.create({
        data: {
          userId:       entry.user_id,
          houseId:      authReq.houseId,
          scheduleDate: new Date(entry.schedule_date),
          shift:        entry.shift,
          startTime:    entry.start_time ?? shiftDefaults.start,
          endTime:      entry.end_time   ?? shiftDefaults.end,
          notes:        entry.notes,
          createdBy:    authReq.userId,
        },
        include: { user: { select: { id: true, name: true, phone: true } } },
      });
      results.push(schedule);

      // Notify employee
      await notificationQueue.add('schedule-created', {
        userId:   user.id,
        userName: user.name,
        date:     entry.schedule_date,
        shift:    entry.shift,
        houseId:  authReq.houseId,
      });
    }

    if (errors.length > 0 && results.length === 0) {
      throw new AppError(400, errors[0] ?? 'Conflito de escala');
    }

    res.status(201).json({
      success: true,
      data: {
        created_count: results.length,
        errors,
        message: `Escala criada (${results.length} entradas). Notificações enviadas.`,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/schedules/:id/confirm */
export async function confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const parsed = ConfirmScheduleSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'Dados inválidos');

    const schedule = await prisma.workSchedule.findFirst({
      where: { id: req.params['id'], houseId: authReq.houseId },
    });
    if (!schedule) throw new AppError(404, 'Escala não encontrada');

    // Only the assigned user or admin/director can confirm
    if (
      schedule.userId !== authReq.userId &&
      authReq.userRole !== 'admin' &&
      authReq.userRole !== 'director'
    ) {
      throw new AppError(403, 'Sem permissão para confirmar esta escala');
    }

    const { confirmed, notes } = parsed.data;
    const updated = await prisma.workSchedule.update({
      where: { id: schedule.id },
      data: {
        confirmedByUser: confirmed,
        confirmedAt:     confirmed ? new Date() : null,
        status:          confirmed ? 'confirmed' : 'scheduled',
        notes:           notes ?? schedule.notes,
        updatedBy:       authReq.userId,
      },
    });

    // Notify director if employee declined
    if (!confirmed) {
      const directors = await prisma.user.findMany({
        where: { houseId: authReq.houseId, role: { in: ['admin', 'director'] }, active: true },
        select: { id: true },
      });
      for (const d of directors) {
        await prisma.notification.create({
          data: {
            userId:    d.id,
            houseId:   authReq.houseId,
            title:     'Funcionário não confirmou escala',
            body:      `Funcionário não confirmou escala do dia ${schedule.scheduleDate.toLocaleDateString('pt-BR')}`,
            type:      'schedule',
            channel:   'in_app',
            entityType: 'schedule',
            entityId:  schedule.id,
          },
        });
      }
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/** POST /api/schedules/:id/check-in */
export async function checkIn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const schedule = await prisma.workSchedule.findFirst({
      where: { id: req.params['id'], houseId: authReq.houseId },
    });
    if (!schedule) throw new AppError(404, 'Escala não encontrada');
    if (schedule.checkedInAt) throw new AppError(400, 'Check-in já registrado');
    if (!['confirmed', 'scheduled'].includes(schedule.status)) {
      throw new AppError(400, `Não é possível fazer check-in com status "${schedule.status}"`);
    }

    const now = new Date();
    const expectedTime = schedule.startTime
      ? new Date(`${schedule.scheduleDate.toISOString().split('T')[0]}T${schedule.startTime}`)
      : null;
    const late = expectedTime ? isLate(expectedTime, now) : false;

    const updated = await prisma.workSchedule.update({
      where: { id: schedule.id },
      data: {
        checkedInAt: now,
        status:      'present',
        updatedBy:   authReq.userId,
      },
    });

    res.json({
      success: true,
      data: {
        id:            updated.id,
        checked_in_at: updated.checkedInAt,
        status:        updated.status,
        expected_time: schedule.startTime,
        is_late:       late,
        message:       'Check-in registrado com sucesso',
      },
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/schedules/:id/check-out */
export async function checkOut(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const schedule = await prisma.workSchedule.findFirst({
      where: { id: req.params['id'], houseId: authReq.houseId },
    });
    if (!schedule) throw new AppError(404, 'Escala não encontrada');
    if (!schedule.checkedInAt) throw new AppError(400, 'Check-in não realizado ainda');
    if (schedule.checkedOutAt) throw new AppError(400, 'Check-out já registrado');

    const now = new Date();
    const workedHours = calculateWorkedHours(schedule.checkedInAt, now);

    const expectedHours =
      schedule.startTime && schedule.endTime
        ? (() => {
            const [sh, sm] = schedule.startTime.split(':').map(Number);
            const [eh, em] = schedule.endTime.split(':').map(Number);
            let h = (eh! - sh!) + (em! - sm!) / 60;
            if (h < 0) h += 24; // overnight shift
            return h;
          })()
        : null;

    const updated = await prisma.workSchedule.update({
      where: { id: schedule.id },
      data: { checkedOutAt: now, updatedBy: authReq.userId },
    });

    res.json({
      success: true,
      data: {
        id:              updated.id,
        checked_out_at:  updated.checkedOutAt,
        worked_hours:    workedHours,
        expected_hours:  expectedHours,
        extra_hours:     expectedHours ? Math.max(0, workedHours - expectedHours) : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/schedules/:id/absence – director only */
export async function absence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;

    if (!['admin', 'director'].includes(authReq.userRole)) {
      throw new AppError(403, 'Apenas diretores podem registrar ausências');
    }

    const parsed = AbsenceSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'Dados inválidos');

    const schedule = await prisma.workSchedule.findFirst({
      where: { id: req.params['id'], houseId: authReq.houseId },
    });
    if (!schedule) throw new AppError(404, 'Escala não encontrada');

    const { reason, approved, notes } = parsed.data;
    const updated = await prisma.workSchedule.update({
      where: { id: schedule.id },
      data: {
        status:          approved ? 'excused_absence' : 'no_show',
        absenceReason:   reason,
        absenceApproved: approved,
        notes:           notes ?? schedule.notes,
        updatedBy:       authReq.userId,
      },
    });

    logger.info({ scheduleId: schedule.id, approved }, 'Absence registered');
    res.json({ success: true, data: { status: updated.status, approved: updated.absenceApproved } });
  } catch (err) {
    next(err);
  }
}

/** GET /api/schedules/:userId/my – employee's own schedules */
export async function getByUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { month } = req.query;
    const userId = req.params['userId'] ?? authReq.userId;

    const dateFilter = month ? { scheduleDate: buildMonthFilter(month as string) } : {};

    const schedules = await prisma.workSchedule.findMany({
      where: { userId, houseId: authReq.houseId, ...dateFilter },
      orderBy: { scheduleDate: 'asc' },
    });
    res.json({ success: true, data: schedules });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/schedules/:id */
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    if (!['admin', 'director'].includes(authReq.userRole)) {
      throw new AppError(403, 'Apenas diretores podem remover escalas');
    }
    const schedule = await prisma.workSchedule.findFirst({
      where: { id: req.params['id'], houseId: authReq.houseId },
    });
    if (!schedule) throw new AppError(404, 'Escala não encontrada');

    await prisma.workSchedule.delete({ where: { id: schedule.id } });
    res.json({ success: true, message: 'Escala removida' });
  } catch (err) {
    next(err);
  }
}
