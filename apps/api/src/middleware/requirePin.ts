import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from './auth.js';

export function requirePin(req: Request, res: Response, next: NextFunction): void {
  void (async () => {
    const authReq = req as AuthRequest;
    const pin = req.headers['x-pin'] as string | undefined;

    if (!pin) {
      res.status(403).json({ error: 'PIN obrigatório para esta ação', code: 'PIN_REQUIRED' });
      return;
    }

    if (!/^\d{6}$/.test(pin)) {
      res.status(400).json({ error: 'PIN inválido', code: 'PIN_INVALID' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: authReq.userId },
      select: { pinHash: true },
    });

    if (!user?.pinHash) {
      res.status(403).json({ error: 'PIN não cadastrado. Configure seu PIN primeiro.', code: 'PIN_NOT_SET' });
      return;
    }

    const valid = await bcrypt.compare(pin, user.pinHash);
    if (!valid) {
      res.status(403).json({ error: 'PIN incorreto', code: 'PIN_WRONG' });
      return;
    }

    (req as Request & { pinVerified?: boolean }).pinVerified = true;
    next();
  })();
}
