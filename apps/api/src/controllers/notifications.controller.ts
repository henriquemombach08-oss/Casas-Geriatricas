import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { unread, limit = 50 } = req.query;

    const notifications = await prisma.notification.findMany({
      where: {
        userId: authReq.userId,
        ...(unread === 'true' ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });
    res.json({ data: notifications });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const notification = await prisma.notification.findFirst({
      where: { id: req.params['id'], userId: authReq.userId },
    });
    if (!notification) throw new AppError(404, 'Notificação não encontrada');

    await prisma.notification.update({ where: { id: notification.id }, data: { read: true } });
    res.json({ data: null, message: 'Marcada como lida' });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    await prisma.notification.updateMany({
      where: { userId: authReq.userId, read: false },
      data: { read: true },
    });
    res.json({ data: null, message: 'Todas marcadas como lidas' });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const notification = await prisma.notification.findFirst({
      where: { id: req.params['id'], userId: authReq.userId },
    });
    if (!notification) throw new AppError(404, 'Notificação não encontrada');

    await prisma.notification.delete({ where: { id: notification.id } });
    res.json({ data: null });
  } catch (err) {
    next(err);
  }
}
