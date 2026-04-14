import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { notificationQueue } from './queues.js';
import { logger } from '../lib/logger.js';

/**
 * Every day at 17:00: remind employees who haven't confirmed tomorrow's schedule.
 */
export function startScheduleConfirmationJob(): void {
  void cron.schedule('0 17 * * *', async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const notConfirmed = await prisma.workSchedule.findMany({
        where: {
          scheduleDate: tomorrow,
          confirmedByUser: false,
          status: 'scheduled',
        },
        include: { user: true },
      });

      if (notConfirmed.length === 0) {
        logger.info('schedule-confirmation: no unconfirmed schedules for tomorrow');
        return;
      }

      for (const schedule of notConfirmed) {
        void notificationQueue.add('schedule-reminder', {
          type: 'schedule_reminder',
          userId: schedule.userId,
          scheduleId: schedule.id,
          message: `Lembrete: você tem escala amanhã (${schedule.shift}). Por favor confirme sua presença.`,
        });
      }

      logger.info({ count: notConfirmed.length }, 'schedule-confirmation: reminders queued');
    } catch (err) {
      logger.error({ err }, 'schedule-confirmation job failed');
    }
  });
  logger.info('schedule-confirmation cron registered (0 17 * * *)');
}

/**
 * Every day at 08:00: mark as no_show schedules from yesterday with status 'confirmed'
 * but no check-in recorded.
 */
export function startNoShowDetectionJob(): void {
  void cron.schedule('0 8 * * *', async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const { count } = await prisma.workSchedule.updateMany({
        where: {
          scheduleDate: yesterday,
          status: 'confirmed',
          checkedInAt: null,
        },
        data: { status: 'no_show' },
      });

      if (count > 0) {
        logger.info({ count }, 'no-show detection: marked schedules as no_show');
      }
    } catch (err) {
      logger.error({ err }, 'no-show detection job failed');
    }
  });
  logger.info('no-show detection cron registered (0 8 * * *)');
}
