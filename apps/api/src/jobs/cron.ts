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

  // Monthly: clean audit logs > 30 days
  cron.schedule('0 2 1 * *', async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deleted = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: thirtyDaysAgo } },
    });
    logger.info({ count: deleted.count }, 'Cleaned old audit logs');
  });

  logger.info('Cron jobs started');
}
