import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const houseId = (req as AuthRequest).houseId;
    const { role, active = 'true' } = req.query as Record<string, string | undefined>;

    const users = await prisma.user.findMany({
      where: {
        houseId,
        ...(role ? { role: role as never } : {}),
        ...(active !== 'all' ? { active: active === 'true' } : {}),
      },
      select: {
        id: true,
        name: true,
        role: true,
        phone: true,
        email: true,
        active: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}
