import type Bull from 'bull';
import { notificationQueue, reportQueue, medicationReminderQueue } from './queues.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { sendSms, sendWhatsApp, sendEmail } from '../services/notifications.service.js';

// ─── Notification jobs ────────────────────────────────────────────────────────

notificationQueue.process('medication-reminder', async (job: Bull.Job) => {
  const { medicationId, residentName, medicationName, houseId, scheduledTime, isOverdue } =
    job.data as {
      medicationId: string;
      residentName: string;
      medicationName: string;
      houseId: string;
      scheduledTime: string;
      isOverdue?: boolean;
    };

  const staff = await prisma.user.findMany({
    where: { houseId, role: { in: ['nurse', 'caregiver', 'admin', 'director'] }, active: true },
    select: { id: true, name: true, phone: true },
  });

  const timeStr = scheduledTime ? ` às ${scheduledTime}` : '';
  const message = isOverdue
    ? `🚨 ATRASADO: ${medicationName} para ${residentName}${timeStr} — administrar imediatamente!`
    : `⚕️ Lembrete: ${medicationName} para ${residentName}${timeStr}`;

  const title = isOverdue ? 'Medicamento ATRASADO' : 'Medicamento próximo';

  for (const user of staff) {
    await prisma.notification.create({
      data: {
        userId: user.id,
        houseId,
        title,
        body: message,
        type: isOverdue ? 'medication_overdue' : 'medication_reminder',
        channel: 'in_app',
        entityType: 'medication',
        entityId: medicationId,
      },
    });

    if (user.phone) {
      await sendSms(user.phone, message).catch((err) =>
        logger.warn({ err }, 'SMS failed'),
      );
      if (isOverdue) {
        await sendWhatsApp(user.phone, message).catch((err) =>
          logger.warn({ err }, 'WhatsApp failed'),
        );
      }
    }
  }
});

notificationQueue.process('medication-not-administered', async (job: Bull.Job) => {
  const { userId, residentName, medicationName, scheduledTime, status, reason, houseId, nursePhone, medicationId } = job.data as {
    userId: string;
    residentName: string;
    medicationName: string;
    scheduledTime?: string;
    status: string;
    reason?: string;
    houseId: string;
    nursePhone?: string;
    medicationId: string;
  };

  const statusLabels: Record<string, string> = {
    refused: 'Recusado',
    missed: 'Omitido',
    delayed: 'Atrasado',
    partially_administered: 'Parcialmente administrado',
    not_available: 'Indisponível',
  };

  const timeStr = scheduledTime ? ` (${scheduledTime})` : '';
  const statusLabel = statusLabels[status] ?? status;
  const message = `⚠️ ${medicationName}${timeStr} para ${residentName}: ${statusLabel}${reason ? `. Motivo: ${reason}` : ''}`;

  await prisma.notification.create({
    data: {
      userId,
      houseId,
      title: 'Medicamento não administrado',
      body: message,
      type: 'medication_alert',
      channel: 'in_app',
      entityType: 'medication',
      entityId: medicationId,
    },
  });

  // SMS + WhatsApp for refused and missed (urgent)
  if ((status === 'refused' || status === 'missed') && nursePhone) {
    await sendSms(nursePhone, message).catch((err) =>
      logger.warn({ err }, 'SMS failed'),
    );
    await sendWhatsApp(nursePhone, message).catch((err) =>
      logger.warn({ err }, 'WhatsApp failed'),
    );
  }
});

notificationQueue.process('schedule-created', async (job: Bull.Job) => {
  const { userId, userName, date, shift, houseId } = job.data as {
    userId: string;
    userName: string;
    date: string;
    shift: string;
    houseId: string;
  };

  const shiftNames: Record<string, string> = {
    morning: 'Manhã',
    afternoon: 'Tarde',
    night: 'Noite',
    full_day: 'Dia Inteiro',
  };

  const message = `📅 Você foi escalado para ${date} - Turno: ${shiftNames[shift] ?? shift}`;

  await prisma.notification.create({
    data: {
      userId,
      houseId,
      title: 'Nova escala',
      body: message,
      type: 'schedule',
      channel: 'in_app',
    },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.phone) {
    await sendSms(user.phone, message).catch((err) =>
      logger.warn({ err }, 'SMS failed'),
    );
  }
});

// ─── Report jobs ──────────────────────────────────────────────────────────────

reportQueue.process('scheduled-report', async (job: Bull.Job) => {
  logger.info({ jobId: job.id }, 'Generating scheduled report');
  // TODO: generate PDF/Excel report and email it
});

// ─── Medication reminder cron ─────────────────────────────────────────────────

medicationReminderQueue.process('check-upcoming', async (job: Bull.Job) => {
  // When called from cron with specific data, use it; otherwise do generic check
  const jobData = job.data as {
    medicationId?: string;
    residentId?: string;
    houseId?: string;
    scheduledTime?: string;
    minutesUntil?: number;
    type?: 'reminder' | 'overdue';
  };

  if (jobData.medicationId) {
    // Specific medication triggered by new cron
    const med = await prisma.medication.findUnique({
      where: { id: jobData.medicationId },
      include: { resident: { select: { name: true } } },
    });
    if (!med) return;

    await notificationQueue.add('medication-reminder', {
      medicationId: med.id,
      residentName: med.resident.name,
      medicationName: med.name,
      houseId: jobData.houseId,
      scheduledTime: jobData.scheduledTime,
      isOverdue: jobData.type === 'overdue',
    });
    return;
  }

  // Legacy: generic upcoming check for next 30 minutes
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 60 * 1000);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const futureTime = `${String(in30.getHours()).padStart(2, '0')}:${String(in30.getMinutes()).padStart(2, '0')}`;
  const today = now.toISOString().split('T')[0] as string;

  const upcomingMeds = await prisma.medication.findMany({
    where: {
      status: 'active',
      startDate: { lte: new Date(today) },
      OR: [{ endDate: null }, { endDate: { gte: new Date(today) } }],
      scheduledTimes: { hasSome: [currentTime, futureTime] },
    },
    include: {
      resident: { select: { id: true, name: true, houseId: true } },
    },
  });

  for (const med of upcomingMeds) {
    await notificationQueue.add('medication-reminder', {
      medicationId: med.id,
      residentName: med.resident.name,
      medicationName: med.name,
      houseId: med.resident.houseId,
      scheduledTime: futureTime,
    });
  }
});

logger.info('Job processors registered');
