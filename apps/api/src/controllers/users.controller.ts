import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

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

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { name, email, password, role, phone } = req.body as {
      name: string; email: string; password: string;
      role: string; phone?: string;
    };
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { res.status(409).json({ success: false, message: 'Email já cadastrado' }); return; }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { houseId: authReq.houseId, name, email, passwordHash, role: role as never, phone },
      select: { id: true, name: true, email: true, role: true, phone: true, active: true },
    });
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params as { id: string };
    const { name, role, phone, active } = req.body as {
      name?: string; role?: string; phone?: string; active?: boolean;
    };
    const user = await prisma.user.findFirst({ where: { id, houseId: authReq.houseId } });
    if (!user) { res.status(404).json({ success: false, message: 'Usuário não encontrado' }); return; }
    const updated = await prisma.user.update({
      where: { id },
      data: { ...(name && { name }), ...(role && { role: role as never }), ...(phone !== undefined && { phone }), ...(active !== undefined && { active }) },
      select: { id: true, name: true, email: true, role: true, phone: true, active: true },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params as { id: string };
    const { password } = req.body as { password: string };
    const user = await prisma.user.findFirst({ where: { id, houseId: authReq.houseId } });
    if (!user) { res.status(404).json({ success: false, message: 'Usuário não encontrado' }); return; }
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
    res.json({ success: true, message: 'Senha redefinida com sucesso' });
  } catch (err) { next(err); }
}
