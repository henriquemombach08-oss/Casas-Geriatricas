import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';

export async function setPin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { pin, currentPin } = req.body as { pin: string; currentPin?: string };

    if (!pin || !/^\d{6}$/.test(pin)) {
      throw new AppError(400, 'PIN deve ter exatamente 6 dígitos numéricos');
    }

    const user = await prisma.user.findUnique({
      where: { id: authReq.userId },
      select: { pinHash: true },
    });

    // If PIN already set, require current PIN to change
    if (user?.pinHash) {
      if (!currentPin) throw new AppError(400, 'Informe o PIN atual para alterá-lo');
      const valid = await bcrypt.compare(currentPin, user.pinHash);
      if (!valid) throw new AppError(403, 'PIN atual incorreto');
    }

    const pinHash = await bcrypt.hash(pin, 10);
    await prisma.user.update({ where: { id: authReq.userId }, data: { pinHash } });

    res.json({ success: true, message: 'PIN configurado com sucesso' });
  } catch (err) {
    next(err);
  }
}

export async function verifyPin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { pin } = req.body as { pin: string };

    if (!pin || !/^\d{6}$/.test(pin)) {
      throw new AppError(400, 'PIN deve ter 6 dígitos');
    }

    const user = await prisma.user.findUnique({
      where: { id: authReq.userId },
      select: { pinHash: true },
    });

    if (!user?.pinHash) {
      throw new AppError(403, 'PIN não cadastrado');
    }

    const valid = await bcrypt.compare(pin, user.pinHash);
    if (!valid) throw new AppError(403, 'PIN incorreto');

    res.json({ success: true, message: 'PIN verificado' });
  } catch (err) {
    next(err);
  }
}

export async function pinStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const user = await prisma.user.findUnique({
      where: { id: authReq.userId },
      select: { pinHash: true },
    });
    res.json({ success: true, data: { hasPin: !!user?.pinHash } });
  } catch (err) {
    next(err);
  }
}
