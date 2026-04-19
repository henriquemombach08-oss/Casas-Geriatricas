import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

const USER_SELECT = {
  id: true, name: true, email: true, role: true,
  customRole: true, phone: true, active: true, photo: true,
} as const;

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
      select: USER_SELECT,
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
    const { name, email, password, role, customRole, phone, photo } = req.body as {
      name: string; email: string; password: string;
      role: string; customRole?: string; phone?: string; photo?: string;
    };
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { res.status(409).json({ success: false, message: 'Email já cadastrado' }); return; }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        houseId: authReq.houseId, name, email, passwordHash,
        role: role as never, customRole: customRole || null, phone,
        photo: photo || null,
      },
      select: USER_SELECT,
    });
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params as { id: string };
    const { name, role, customRole, phone, active, photo } = req.body as {
      name?: string; role?: string; customRole?: string;
      phone?: string; active?: boolean; photo?: string;
    };
    const user = await prisma.user.findFirst({ where: { id, houseId: authReq.houseId } });
    if (!user) { res.status(404).json({ success: false, message: 'Usuário não encontrado' }); return; }
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(role && { role: role as never }),
        ...(role === 'other' ? { customRole: customRole || null } : role ? { customRole: null } : {}),
        ...(phone !== undefined && { phone }),
        ...(active !== undefined && { active }),
        ...(photo !== undefined && { photo }),
      },
      select: USER_SELECT,
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

export async function registerPushToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { token } = req.body as { token: string };
    if (!token) { res.status(400).json({ success: false, message: 'Token obrigatório' }); return; }
    await prisma.user.update({
      where: { id: authReq.userId },
      data: { expoPushToken: token },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
}
