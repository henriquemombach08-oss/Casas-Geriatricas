import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';
import {
  detectConflicts,
  predictAbsenceRisk,
  generateAndSave,
} from '../services/ai-schedule.service.js';
import { generateCarePlanFromDiagnoses } from '../services/care-plan.service.js';
import {
  calculateAndSaveRiskScore,
  calculateHouseRiskScores,
} from '../services/risk-prediction.service.js';

function houseId(req: Request): string {
  return (req as AuthRequest).houseId;
}

function userId(req: Request): string {
  return (req as AuthRequest).userId;
}

function currentMonth(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

// ─── AI Schedule ──────────────────────────────────────────────────────────────

/** GET /api/ai/schedule/analyze?month=YYYY-MM */
export async function analyzeSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const month = (req.query['month'] as string | undefined) ?? currentMonth();
    const hid = houseId(req);

    const [conflicts, absenceRisk] = await Promise.all([
      detectConflicts(hid, month),
      predictAbsenceRisk(hid, month),
    ]);

    const summary = {
      total_conflicts: conflicts.length,
      high_severity: conflicts.filter((c) => c.severity === 'high').length,
      medium_severity: conflicts.filter((c) => c.severity === 'medium').length,
      staff_at_risk: absenceRisk.filter((s) => s.absenceRisk >= 40).length,
    };

    res.json({ success: true, data: { month, summary, conflicts, absence_risk: absenceRisk } });
  } catch (err) {
    next(err);
  }
}

/** POST /api/ai/schedule/suggest */
export async function suggestSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month = currentMonth() } = req.body as { month?: string };
    const hid = houseId(req);
    const generatedBy = userId(req);

    const saved = await generateAndSave(hid, month, generatedBy);

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
}

/** GET /api/ai/schedule/suggestions?month=YYYY-MM */
export async function getScheduleSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const month = (req.query['month'] as string | undefined) ?? currentMonth();
    const hid = houseId(req);

    const suggestion = await prisma.aIScheduleSuggestion.findFirst({
      where: { houseId: hid, month },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: suggestion ?? null });
  } catch (err) {
    next(err);
  }
}

// ─── Risk Scores ──────────────────────────────────────────────────────────────

/** GET /api/ai/risk-scores */
export async function getHouseRiskScores(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const hid = houseId(req);
    await calculateHouseRiskScores(hid);

    const scores = await prisma.residentRiskScore.findMany({
      where: { houseId: hid },
      include: { resident: { select: { id: true, name: true, status: true } } },
      orderBy: { overallRisk: 'desc' },
    });

    res.json({ success: true, data: scores });
  } catch (err) {
    next(err);
  }
}

/** GET /api/ai/risk-scores/:residentId */
export async function getResidentRiskScore(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { residentId } = req.params as { residentId: string };
    const hid = houseId(req);

    const score = await calculateAndSaveRiskScore(residentId, hid);

    res.json({ success: true, data: score });
  } catch (err) {
    next(err);
  }
}

// ─── Care Plans ───────────────────────────────────────────────────────────────

/** GET /api/care-plans?residentId=uuid */
export async function listCarePlans(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const hid = houseId(req);
    const residentId = req.query['residentId'] as string | undefined;

    const plans = await prisma.carePlan.findMany({
      where: {
        houseId: hid,
        ...(residentId ? { residentId } : {}),
      },
      include: {
        tasks: { orderBy: { createdAt: 'asc' } },
        resident: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
}

/** POST /api/care-plans */
export async function createCarePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const hid = houseId(req);
    const {
      residentId,
      title,
      diagnoses = [],
      startDate,
      reviewDate,
      notes,
      tasks = [],
    } = req.body as {
      residentId: string;
      title: string;
      diagnoses?: string[];
      startDate: string;
      reviewDate?: string;
      notes?: string;
      tasks?: Array<{ title: string; category?: string; frequency?: string; description?: string }>;
    };

    const plan = await prisma.carePlan.create({
      data: {
        residentId,
        houseId: hid,
        title,
        diagnoses,
        startDate: new Date(startDate),
        reviewDate: reviewDate ? new Date(reviewDate) : null,
        notes,
        createdBy: userId(req),
        tasks: {
          create: tasks.map((t) => ({
            title: t.title,
            category: (t.category as never) ?? 'other',
            frequency: t.frequency,
            description: t.description,
          })),
        },
      },
      include: { tasks: true, resident: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
}

/** POST /api/care-plans/auto-generate */
export async function autoGenerateCarePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const hid = houseId(req);
    const { residentId } = req.body as { residentId: string };

    const resident = await prisma.resident.findFirst({
      where: { id: residentId, houseId: hid, deletedAt: null },
      include: {
        medications: { where: { status: 'active' }, select: { name: true } },
      },
    });

    if (!resident) {
      res.status(404).json({ success: false, error: 'Residente não encontrado' });
      return;
    }

    const history = (resident.medicalHistory as Record<string, unknown>) ?? {};
    const diagnosesRaw = (history['diagnoses'] as string[] | undefined) ?? [];
    const diagnosesFromHistory = Array.isArray(diagnosesRaw) ? diagnosesRaw : [];
    const medNames = resident.medications.map((m) => m.name);
    const allDiagnoses = [...diagnosesFromHistory, ...medNames];

    const age = Math.floor(
      (Date.now() - resident.birthDate.getTime()) / (365.25 * 86_400_000),
    );

    const generated = generateCarePlanFromDiagnoses(allDiagnoses, age);

    const reviewDate = new Date();
    reviewDate.setMonth(reviewDate.getMonth() + 6);

    const plan = await prisma.carePlan.create({
      data: {
        residentId,
        houseId: hid,
        title: generated.title,
        diagnoses: allDiagnoses.slice(0, 10),
        startDate: new Date(),
        reviewDate,
        createdBy: userId(req),
        tasks: {
          create: generated.tasks.map((t) => ({
            title: t.title,
            category: t.category as never,
            frequency: t.frequency,
            description: t.description,
          })),
        },
      },
      include: { tasks: true, resident: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/care-plans/:id */
export async function updateCarePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const hid = houseId(req);
    const { title, diagnoses, status, reviewDate, notes } = req.body as {
      title?: string;
      diagnoses?: string[];
      status?: string;
      reviewDate?: string;
      notes?: string;
    };

    const plan = await prisma.carePlan.updateMany({
      where: { id, houseId: hid },
      data: {
        ...(title ? { title } : {}),
        ...(diagnoses ? { diagnoses } : {}),
        ...(status ? { status: status as never } : {}),
        ...(reviewDate ? { reviewDate: new Date(reviewDate) } : {}),
        ...(notes !== undefined ? { notes } : {}),
        updatedBy: userId(req),
      },
    });

    if (plan.count === 0) {
      res.status(404).json({ success: false, error: 'Plano não encontrado' });
      return;
    }

    const updated = await prisma.carePlan.findUnique({
      where: { id },
      include: { tasks: true },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/care-plans/:id */
export async function deleteCarePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const hid = houseId(req);

    await prisma.carePlan.deleteMany({ where: { id, houseId: hid } });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/care-plans/tasks/:taskId */
export async function updateCarePlanTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { taskId } = req.params as { taskId: string };
    const { completed, notes, frequency } = req.body as {
      completed?: boolean;
      notes?: string;
      frequency?: string;
    };

    const task = await prisma.carePlanTask.update({
      where: { id: taskId },
      data: {
        ...(completed !== undefined ? {
          completed,
          completedAt: completed ? new Date() : null,
          completedBy: completed ? userId(req) : null,
        } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(frequency ? { frequency } : {}),
      },
    });

    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
}
