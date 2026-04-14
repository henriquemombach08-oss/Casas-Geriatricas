import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import { writeAuditLog } from '../middleware/auditLog.js';
import { notificationQueue } from '../jobs/queues.js';
import { logger } from '../lib/logger.js';

// ─── Validation helpers ────────────────────────────────────────────────────

const timePattern = /^\d{2}:\d{2}$/;

function validateScheduledTimes(times: string[]): boolean {
  if (times.length === 0) return false;
  const unique = new Set(times);
  return unique.size === times.length && times.every((t) => timePattern.test(t));
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────

const CreateMedicationSchema = z
  .object({
    residentId: z.string().uuid('residentId inválido'),
    name: z.string().min(1, 'Nome é obrigatório').max(255),
    activeIngredient: z.string().max(255).optional(),
    dosage: z.string().max(100).optional(),
    measurementUnit: z
      .enum(['mg', 'ml', 'comp', 'gotas', 'mcg', 'g', 'ui', 'other'])
      .optional(),
    frequency: z.string().max(100).optional(),
    frequencyDescription: z
      .string()
      .min(1, 'Descrição da frequência é obrigatória')
      .max(255),
    timesPerDay: z
      .number()
      .int()
      .min(1)
      .max(24, 'Máximo 24 doses por dia'),
    scheduledTimes: z
      .array(z.string().regex(timePattern, 'Horário deve ser HH:MM'))
      .min(1, 'Ao menos um horário é obrigatório'),
    startDate: z.string().date('Data de início inválida'),
    endDate: z.string().date('Data de término inválida').optional(),
    prescriptionDate: z.string().date('Data de prescrição inválida').optional(),
    prescriberName: z.string().max(255).optional(),
    prescriberCrm: z.string().max(20).optional(),
    prescriberPhone: z
      .string()
      .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
      .optional(),
    prescriberEmail: z.string().email('Email inválido').optional(),
    pharmacyCode: z.string().max(50).optional(),
    pharmacyName: z.string().max(255).optional(),
    pharmacyBatchNumber: z.string().max(100).optional(),
    pharmacyExpiration: z.string().date().optional(),
    pharmacyCnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos').optional(),
    sideEffects: z.string().optional(),
    contraindications: z.string().optional(),
    interactionWarnings: z.string().optional(),
    specialInstructions: z.string().optional(),
    instructionsForCaregiver: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (d) => d.scheduledTimes.length === d.timesPerDay,
    {
      message: 'Quantidade de horários deve ser igual a timesPerDay',
      path: ['scheduledTimes'],
    },
  )
  .refine(
    (d) => validateScheduledTimes(d.scheduledTimes),
    {
      message: 'Horários duplicados ou inválidos',
      path: ['scheduledTimes'],
    },
  )
  .refine(
    (d) => {
      if (!d.endDate) return true;
      return new Date(d.endDate) >= new Date(d.startDate);
    },
    {
      message: 'Data de término deve ser posterior à data de início',
      path: ['endDate'],
    },
  );

// UpdateMedicationSchema built from scratch (can't .omit() on refined ZodEffects)
const UpdateMedicationSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    activeIngredient: z.string().max(255).optional(),
    dosage: z.string().max(100).optional(),
    measurementUnit: z
      .enum(['mg', 'ml', 'comp', 'gotas', 'mcg', 'g', 'ui', 'other'])
      .optional(),
    frequency: z.string().max(100).optional(),
    frequencyDescription: z.string().max(255).optional(),
    timesPerDay: z.number().int().min(1).max(24).optional(),
    scheduledTimes: z
      .array(z.string().regex(timePattern, 'Horário deve ser HH:MM'))
      .optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    prescriptionDate: z.string().date().optional(),
    prescriberName: z.string().max(255).optional(),
    prescriberCrm: z.string().max(20).optional(),
    prescriberPhone: z.string().regex(/^\d{10,11}$/).optional(),
    prescriberEmail: z.string().email().optional(),
    pharmacyCode: z.string().max(50).optional(),
    pharmacyName: z.string().max(255).optional(),
    pharmacyBatchNumber: z.string().max(100).optional(),
    pharmacyExpiration: z.string().date().optional(),
    pharmacyCnpj: z.string().regex(/^\d{14}$/).optional(),
    sideEffects: z.string().optional(),
    contraindications: z.string().optional(),
    interactionWarnings: z.string().optional(),
    specialInstructions: z.string().optional(),
    instructionsForCaregiver: z.string().optional(),
    notes: z.string().optional(),
    reasonForChange: z.string().min(1, 'Motivo da alteração é obrigatório'),
  })
  .refine(
    (d) => {
      if (!d.timesPerDay || !d.scheduledTimes) return true;
      return d.scheduledTimes.length === d.timesPerDay;
    },
    {
      message: 'Quantidade de horários deve ser igual a timesPerDay',
      path: ['scheduledTimes'],
    },
  );

const RegisterLogSchema = z
  .object({
    scheduledTime: z
      .string()
      .regex(timePattern, 'Horário deve ser HH:MM')
      .optional(),
    status: z.enum([
      'administered',
      'refused',
      'missed',
      'delayed',
      'partially_administered',
      'not_available',
    ]),
    administeredAt: z.string().datetime({ offset: true }).optional(),
    dosageActuallyGiven: z.string().max(100).optional(),
    reasonIfNotGiven: z.string().min(1).optional(),
    residentComplaint: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (d) => {
      if (d.status === 'administered' || d.status === 'partially_administered') {
        return !!d.administeredAt;
      }
      return true;
    },
    {
      message: 'administeredAt é obrigatório quando status é administered ou partially_administered',
      path: ['administeredAt'],
    },
  )
  .refine(
    (d) => {
      if (d.status !== 'administered') {
        return !!d.reasonIfNotGiven;
      }
      return true;
    },
    {
      message: 'reasonIfNotGiven é obrigatório quando medicamento não foi administrado',
      path: ['reasonIfNotGiven'],
    },
  )
  .refine(
    (d) => {
      if (!d.administeredAt) return true;
      const diff = Date.now() - new Date(d.administeredAt).getTime();
      return diff <= 24 * 60 * 60 * 1000; // max 24h no passado
    },
    {
      message: 'administeredAt não pode ser anterior a 24 horas',
      path: ['administeredAt'],
    },
  );

// ─── Helpers ──────────────────────────────────────────────────────────────

function calculateAdherenceRate(
  logs: Array<{ status: string }>,
): number {
  if (logs.length === 0) return 0;
  const administered = logs.filter(
    (l) => l.status === 'administered' || l.status === 'partially_administered',
  ).length;
  return Math.round((administered / logs.length) * 100);
}

// ─── Controllers ──────────────────────────────────────────────────────────

/** GET /api/medications/resident/:residentId */
export async function listByResident(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const resident = await prisma.resident.findFirst({
      where: {
        id: req.params['residentId'],
        houseId: authReq.houseId,
        deletedAt: null,
      },
    });
    if (!resident) throw new AppError(404, 'Residente não encontrado');

    const { status, active: activeParam } = req.query;
    const statusFilter =
      status === 'active' || status === 'inactive'
        ? status
        : activeParam === 'false'
          ? 'inactive'
          : 'active';

    const medications = await prisma.medication.findMany({
      where: {
        residentId: resident.id,
        status: statusFilter,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: medications });
  } catch (err) {
    next(err);
  }
}

/** GET /api/medications/scheduled/next */
export async function getScheduledNext(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const upcomingMinutes = Number(req.query['upcoming_in_minutes'] ?? 60);

    // Raw query against the VIEW (created in supabase_extras.sql)
    // Fallback: compute from Prisma if VIEW not available
    const now = new Date();

    const activeMeds = await prisma.medication.findMany({
      where: {
        status: 'active',
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
        resident: {
          houseId: authReq.houseId,
          status: 'active',
          deletedAt: null,
        },
      },
      include: {
        resident: { select: { id: true, name: true, photoUrl: true } },
        logs: {
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
          select: { id: true, scheduledTime: true, status: true },
        },
      },
    });

    const todayStr = now.toISOString().split('T')[0] as string;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    interface NextMedItem {
      id: string;
      medication_id: string;
      resident_id: string;
      resident_name: string;
      resident_photo: string | null;
      medication_name: string;
      dosage: string | null;
      measurement_unit: string | null;
      scheduled_time: string;
      minutes_until: number;
      special_instructions: string | null;
      instructions_for_caregiver: string | null;
      interaction_warnings: string | null;
      is_overdue: boolean;
      already_administered: boolean;
    }

    const nextMedications: NextMedItem[] = [];

    for (const med of activeMeds) {
      for (const time of med.scheduledTimes) {
        const [hh, mm] = time.split(':').map(Number);
        const scheduledMinutes = (hh ?? 0) * 60 + (mm ?? 0);
        const minutesUntil = scheduledMinutes - nowMinutes;

        const alreadyAdministered = med.logs.some(
          (l) =>
            l.scheduledTime === time &&
            (l.status === 'administered' || l.status === 'partially_administered'),
        );

        const isOverdue = minutesUntil < 0 && !alreadyAdministered;

        // Include if: not yet administered AND (upcoming within window OR overdue)
        if (!alreadyAdministered && (minutesUntil <= upcomingMinutes || isOverdue)) {
          nextMedications.push({
            id: `${med.id}_${time}`,
            medication_id: med.id,
            resident_id: med.resident.id,
            resident_name: med.resident.name,
            resident_photo: med.resident.photoUrl,
            medication_name: med.name,
            dosage: med.dosage,
            measurement_unit: med.measurementUnit,
            scheduled_time: time,
            minutes_until: minutesUntil,
            special_instructions: med.specialInstructions,
            instructions_for_caregiver: med.instructionsForCaregiver,
            interaction_warnings: med.interactionWarnings,
            is_overdue: isOverdue,
            already_administered: alreadyAdministered,
          });
        }
      }
    }

    nextMedications.sort((a, b) => a.minutes_until - b.minutes_until);

    const urgentCount = nextMedications.filter((m) => m.is_overdue).length;

    res.json({
      success: true,
      data: {
        date: todayStr,
        next_medications: nextMedications,
        total: nextMedications.length,
        urgent_count: urgentCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/medications */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const parsed = CreateMedicationSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? 'Dados inválidos', {
        details: parsed.error.errors,
      });
    }
    const data = parsed.data;

    const resident = await prisma.resident.findFirst({
      where: { id: data.residentId, houseId: authReq.houseId, deletedAt: null },
    });
    if (!resident) throw new AppError(404, 'Residente não encontrado');
    if (resident.status !== 'active') {
      throw new AppError(400, 'Residente inativo não pode receber prescrição');
    }

    const medication = await prisma.medication.create({
      data: {
        residentId: data.residentId,
        name: data.name,
        activeIngredient: data.activeIngredient,
        dosage: data.dosage,
        measurementUnit: data.measurementUnit,
        frequency: data.frequency,
        frequencyDescription: data.frequencyDescription,
        timesPerDay: data.timesPerDay,
        scheduledTimes: data.scheduledTimes,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        prescriptionDate: data.prescriptionDate ? new Date(data.prescriptionDate) : null,
        prescriberName: data.prescriberName,
        prescriberCrm: data.prescriberCrm,
        prescriberPhone: data.prescriberPhone,
        prescriberEmail: data.prescriberEmail,
        pharmacyCode: data.pharmacyCode,
        pharmacyName: data.pharmacyName,
        pharmacyBatchNumber: data.pharmacyBatchNumber,
        pharmacyExpiration: data.pharmacyExpiration ? new Date(data.pharmacyExpiration) : null,
        pharmacyCnpj: data.pharmacyCnpj,
        sideEffects: data.sideEffects,
        contraindications: data.contraindications,
        interactionWarnings: data.interactionWarnings,
        specialInstructions: data.specialInstructions,
        instructionsForCaregiver: data.instructionsForCaregiver,
        notes: data.notes,
        createdBy: authReq.userId,
        updatedBy: authReq.userId,
        status: 'active',
      },
    });

    await writeAuditLog({
      houseId: authReq.houseId,
      userId: authReq.userId,
      action: 'created_medication',
      entityType: 'medication',
      entityId: medication.id,
      newValues: { name: medication.name, residentId: medication.residentId },
    });

    res.status(201).json({ success: true, data: medication });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/medications/:id */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const existing = await prisma.medication.findFirst({
      where: { id: req.params['id'], resident: { houseId: authReq.houseId } },
    });
    if (!existing) throw new AppError(404, 'Medicamento não encontrado');
    if (existing.status === 'inactive') {
      throw new AppError(400, 'Medicamento inativo não pode ser editado');
    }

    const parsed = UpdateMedicationSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? 'Dados inválidos', {
        details: parsed.error.errors,
      });
    }
    const { reasonForChange, ...updateData } = parsed.data;

    const updated = await prisma.medication.update({
      where: { id: req.params['id'] },
      data: {
        ...updateData,
        startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
        endDate: updateData.endDate !== undefined
          ? updateData.endDate ? new Date(updateData.endDate) : null
          : undefined,
        prescriptionDate: updateData.prescriptionDate
          ? new Date(updateData.prescriptionDate)
          : undefined,
        pharmacyExpiration: updateData.pharmacyExpiration
          ? new Date(updateData.pharmacyExpiration)
          : undefined,
        updatedBy: authReq.userId,
      },
    });

    await writeAuditLog({
      houseId: authReq.houseId,
      userId: authReq.userId,
      action: 'updated_medication',
      entityType: 'medication',
      entityId: updated.id,
      oldValues: {
        name: existing.name,
        dosage: existing.dosage,
        scheduledTimes: existing.scheduledTimes,
      },
      newValues: {
        name: updated.name,
        dosage: updated.dosage,
        scheduledTimes: updated.scheduledTimes,
        reasonForChange,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/medications/:id — soft delete (discontinue) */
export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const existing = await prisma.medication.findFirst({
      where: { id: req.params['id'], resident: { houseId: authReq.houseId } },
    });
    if (!existing) throw new AppError(404, 'Medicamento não encontrado');

    const { reason } = req.body as { reason?: string };
    if (!reason || reason.trim().length === 0) {
      throw new AppError(400, 'Motivo da descontinuação é obrigatório');
    }

    const updated = await prisma.medication.update({
      where: { id: req.params['id'] },
      data: {
        status: 'inactive',
        reasonIfInactive: reason.trim(),
        updatedBy: authReq.userId,
      },
    });

    await writeAuditLog({
      houseId: authReq.houseId,
      userId: authReq.userId,
      action: 'discontinued_medication',
      entityType: 'medication',
      entityId: updated.id,
      oldValues: { status: 'active' },
      newValues: { status: 'inactive', reason },
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        reason_if_inactive: updated.reasonIfInactive,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/medications/:id/logs — CRITICAL: register administration */
export async function registerLog(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const medication = await prisma.medication.findFirst({
      where: { id: req.params['id'], resident: { houseId: authReq.houseId } },
      include: { resident: true },
    });
    if (!medication) throw new AppError(404, 'Medicamento não encontrado');
    if (medication.status === 'inactive') {
      throw new AppError(400, 'Medicamento está inativo');
    }

    const parsed = RegisterLogSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? 'Dados inválidos', {
        details: parsed.error.errors,
      });
    }
    const data = parsed.data;

    // Validate scheduled_time belongs to this medication
    if (data.scheduledTime && !medication.scheduledTimes.includes(data.scheduledTime)) {
      throw new AppError(
        400,
        `Horário ${data.scheduledTime} não pertence a este medicamento. Horários válidos: ${medication.scheduledTimes.join(', ')}`,
      );
    }

    const log = await prisma.medicationLog.create({
      data: {
        medicationId: medication.id,
        residentId: medication.residentId,
        administeredBy: authReq.userId,
        scheduledTime: data.scheduledTime,
        administeredAt: data.administeredAt ? new Date(data.administeredAt) : null,
        status: data.status,
        dosageActuallyGiven: data.dosageActuallyGiven,
        reasonIfNotGiven: data.reasonIfNotGiven,
        residentComplaint: data.residentComplaint,
        notes: data.notes,
      },
      include: {
        administratedBy: { select: { id: true, name: true, role: true } },
      },
    });

    // Send notification if not administered
    if (log.status !== 'administered') {
      const nurses = await prisma.user.findMany({
        where: {
          houseId: authReq.houseId,
          role: { in: ['nurse', 'admin', 'director'] },
          active: true,
        },
        select: { id: true, phone: true },
      });

      for (const nurse of nurses) {
        await notificationQueue.add('medication-not-administered', {
          userId: nurse.id,
          houseId: authReq.houseId,
          medicationId: medication.id,
          residentName: medication.resident?.name ?? '',
          medicationName: medication.name,
          scheduledTime: data.scheduledTime,
          status: log.status,
          reason: log.reasonIfNotGiven,
          nursePhone: nurse.phone,
        });
      }
    }

    await writeAuditLog({
      houseId: authReq.houseId,
      userId: authReq.userId,
      action: 'registered_medication_log',
      entityType: 'medication_log',
      entityId: log.id,
      newValues: {
        status: log.status,
        medicationId: medication.id,
        scheduledTime: data.scheduledTime,
        residentId: medication.residentId,
      },
    });

    logger.info(
      { logId: log.id, status: log.status, medicationId: medication.id },
      'Medication log registered',
    );

    res.status(201).json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
}

/** GET /api/medications/:id/history */
export async function getHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const medication = await prisma.medication.findFirst({
      where: { id: req.params['id'], resident: { houseId: authReq.houseId } },
      include: { resident: { select: { id: true, name: true, photoUrl: true } } },
    });
    if (!medication) throw new AppError(404, 'Medicamento não encontrado');

    const days = Math.min(Number(req.query['days'] ?? 30), 90);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await prisma.medicationLog.findMany({
      where: {
        medicationId: medication.id,
        createdAt: { gte: since },
      },
      include: {
        administratedBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const adherenceRate = calculateAdherenceRate(logs);

    const statusCounts = logs.reduce<Record<string, number>>((acc, log) => {
      acc[log.status] = (acc[log.status] ?? 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        medication,
        logs,
        stats: {
          total_logs: logs.length,
          adherence_rate: adherenceRate,
          period_days: days,
          status_counts: statusCounts,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/medications/scheduled/today — kept for backward compat */
export async function scheduledToday(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Delegate to getScheduledNext with 24h window
  req.query['upcoming_in_minutes'] = '1440';
  return getScheduledNext(req, res, next);
}
