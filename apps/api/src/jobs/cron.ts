import cron from 'node-cron';
import { medicationReminderQueue } from './queues.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { notificationQueue } from './queues.js';

export function startCronJobs(): void {
  // Every 5 minutes: check upcoming medications (next 30 min) and overdue (> 30 min late)
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      const activeMeds = await prisma.medication.findMany({
        where: {
          status: 'active',
          startDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gte: now } }],
          resident: { status: 'active', deletedAt: null },
        },
        include: {
          resident: { select: { id: true, name: true, houseId: true } },
          logs: {
            where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
            select: { scheduledTime: true, status: true },
          },
        },
      });

      for (const med of activeMeds) {
        for (const time of med.scheduledTimes) {
          const [hh, mm] = time.split(':').map(Number);
          const scheduledMinutes = (hh ?? 0) * 60 + (mm ?? 0);
          const minutesUntil = scheduledMinutes - nowMinutes;

          const alreadyHandled = med.logs.some((l) => l.scheduledTime === time);
          if (alreadyHandled) continue;

          if (minutesUntil >= 0 && minutesUntil <= 30) {
            // Upcoming in 30 minutes — send reminder
            await medicationReminderQueue.add('check-upcoming', {
              medicationId: med.id,
              residentId: med.resident.id,
              houseId: med.resident.houseId,
              scheduledTime: time,
              minutesUntil,
              type: 'reminder',
            });
          } else if (minutesUntil < -30) {
            // Overdue by more than 30 minutes — urgent alert
            await medicationReminderQueue.add('check-upcoming', {
              medicationId: med.id,
              residentId: med.resident.id,
              houseId: med.resident.houseId,
              scheduledTime: time,
              minutesUntil,
              type: 'overdue',
            });
          }
        }
      }
    } catch (err) {
      logger.error({ err }, 'Medication cron error');
    }
  });

  // Daily at 8am: check expiring documents (7 days)
  cron.schedule('0 8 * * *', async () => {
    const sevenDays = new Date();
    sevenDays.setDate(sevenDays.getDate() + 7);

    const expiringDocs = await prisma.document.findMany({
      where: { expiresAt: { lte: sevenDays, gte: new Date() } },
      include: {
        resident: { select: { houseId: true, name: true } },
        uploader: { select: { id: true } },
      },
    });

    for (const doc of expiringDocs) {
      // Notify admins in this house
      const admins = await prisma.user.findMany({
        where: { houseId: doc.resident.houseId, role: { in: ['admin', 'director'] }, active: true },
        select: { id: true },
      });

      for (const admin of admins) {
        await notificationQueue.add('document-expiring', {
          userId: admin.id,
          houseId: doc.resident.houseId,
          residentName: doc.resident.name,
          docType: doc.type,
          expiresAt: doc.expiresAt,
        });
      }
    }
  });

  // Daily at midnight: mark overdue financial records
  cron.schedule('0 0 * * *', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await prisma.financialRecord.updateMany({
      where: {
        status: 'pending',
        dueDate: { lt: yesterday },
      },
      data: { status: 'overdue' },
    });
  });

  // Daily at 17:00: remind employees who haven't confirmed tomorrow's schedule
  cron.schedule('0 17 * * *', async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const notConfirmed = await prisma.workSchedule.findMany({
        where: { scheduleDate: tomorrow, confirmedByUser: false, status: 'scheduled' },
        include: { user: { select: { id: true, name: true } } },
      });

      for (const schedule of notConfirmed) {
        await notificationQueue.add('schedule-reminder', {
          type: 'schedule_reminder',
          userId: schedule.userId,
          scheduleId: schedule.id,
          message: `Lembrete: você tem escala amanhã (${schedule.shift}). Por favor confirme sua presença.`,
        });
      }
      if (notConfirmed.length > 0) {
        logger.info({ count: notConfirmed.length }, 'Schedule confirmation reminders queued');
      }
    } catch (err) {
      logger.error({ err }, 'Schedule confirmation cron error');
    }
  });

  // Daily at 08:00: mark as no_show schedules from yesterday with no check-in
  cron.schedule('5 8 * * *', async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const { count } = await prisma.workSchedule.updateMany({
        where: { scheduleDate: yesterday, status: 'confirmed', checkedInAt: null },
        data: { status: 'no_show' },
      });

      if (count > 0) {
        logger.info({ count }, 'No-show detection: marked schedules as no_show');
      }
    } catch (err) {
      logger.error({ err }, 'No-show detection cron error');
    }
  });

  // Monthly: clean audit logs > 30 days
  cron.schedule('0 2 1 * *', async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deleted = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: thirtyDaysAgo } },
    });
    logger.info({ count: deleted.count }, 'Cleaned old audit logs');
  });

  // Daily at 03:00: backup health-check — log active house and resident counts as a baseline snapshot.
  // NOTE: Point-in-Time Recovery is enabled on Supabase (Pro plan). This cron validates DB connectivity
  // and logs a snapshot so incidents can be correlated to a known-good state.
  cron.schedule('0 3 * * *', async () => {
    try {
      const [houseCount, residentCount, userCount] = await Promise.all([
        prisma.house.count(),
        prisma.resident.count({ where: { deletedAt: null } }),
        prisma.user.count({ where: { active: true } }),
      ]);
      logger.info(
        { houseCount, residentCount, userCount, timestamp: new Date().toISOString() },
        'Daily backup health-check — DB snapshot OK',
      );
    } catch (err) {
      logger.error({ err }, 'Daily backup health-check FAILED — investigate immediately');
    }
  });

  logger.info('Cron jobs started');
}
