import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';
import { prisma } from '../lib/prisma.js';

export function auditLog(action: string, entityType: string) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    // Injected into the request for controllers to populate entityId + values
    req.body._audit = { action, entityType };
    next();
  };
}

export async function writeAuditLog(params: {
  houseId: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.auditLog.create({ data: params as any });
}
