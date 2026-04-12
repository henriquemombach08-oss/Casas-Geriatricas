import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
type UserRole = 'admin' | 'director' | 'nurse' | 'caregiver' | 'admin_finance';

const registerSchema = Joi.object({
  houseId: Joi.string().uuid().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).required(),
  role: Joi.string()
    .valid('admin', 'director', 'nurse', 'caregiver', 'admin_finance')
    .required(),
  phone: Joi.string().optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

function signTokens(userId: string, houseId: string, role: UserRole) {
  const token = jwt.sign({ sub: userId, houseId, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
  return { token, refreshToken };
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) throw new AppError(400, error.message);

    const existing = await prisma.user.findUnique({ where: { email: value.email as string } });
    if (existing) throw new AppError(409, 'Email já cadastrado');

    const passwordHash = await bcrypt.hash(value.password as string, 12);
    const user = await prisma.user.create({
      data: {
        houseId: value.houseId as string,
        email: value.email as string,
        passwordHash,
        name: value.name as string,
        role: value.role as UserRole,
        phone: value.phone as string | undefined,
      },
      select: { id: true, email: true, name: true, role: true, houseId: true },
    });

    res.status(201).json({ data: user, message: 'Usuário criado com sucesso' });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) throw new AppError(400, error.message);

    const user = await prisma.user.findUnique({ where: { email: value.email as string } });
    if (!user || !user.active) throw new AppError(401, 'Credenciais inválidas');

    const valid = await bcrypt.compare(value.password as string, user.passwordHash);
    if (!valid) throw new AppError(401, 'Credenciais inválidas');

    const { token, refreshToken } = signTokens(user.id, user.houseId, user.role);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    res.json({
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          houseId: user.houseId,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    res.json({ data: null, message: 'Logout realizado' });
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken: token } = req.body as { refreshToken?: string };
    if (!token) throw new AppError(401, 'Refresh token não fornecido');

    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError(401, 'Refresh token inválido ou expirado');
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.active) throw new AppError(401, 'Usuário inativo');

    // Rotate token
    await prisma.refreshToken.delete({ where: { token } });
    const tokens = signTokens(user.id, user.houseId, user.role);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({ data: tokens });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const user = await prisma.user.findUnique({
      where: { id: authReq.userId },
      select: { id: true, email: true, name: true, role: true, houseId: true, phone: true, active: true },
    });
    if (!user) throw new AppError(404, 'Usuário não encontrado');
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}
