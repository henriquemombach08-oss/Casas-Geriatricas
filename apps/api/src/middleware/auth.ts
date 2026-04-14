import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
type UserRole = 'admin' | 'director' | 'nurse' | 'caregiver' | 'admin_finance';

export interface AuthRequest extends Request {
  userId: string;
  houseId: string;
  userRole: UserRole;
}

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['*'],
  director: ['view_reports', 'manage_financial', 'manage_users', 'view_all_data'],
  nurse: ['manage_medications', 'view_residents', 'manage_medical_history'],
  caregiver: ['view_residents', 'register_medication', 'register_visitor'],
  admin_finance: ['manage_financial', 'generate_nfe', 'view_reports'],
};

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as {
      sub: string;
      houseId: string;
      role: UserRole;
    };

    const authReq = req as AuthRequest;
    authReq.userId = payload.sub;
    authReq.houseId = payload.houseId;
    authReq.userRole = payload.role;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    const userPerms = ROLE_PERMISSIONS[authReq.userRole] ?? [];

    if (userPerms.includes('*') || userPerms.includes(permission)) {
      next();
    } else {
      res.status(403).json({ error: 'Sem permissão para esta ação' });
    }
  };
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    if (roles.includes(authReq.userRole)) {
      next();
    } else {
      res.status(403).json({ error: 'Sem permissão para esta ação' });
    }
  };
}
