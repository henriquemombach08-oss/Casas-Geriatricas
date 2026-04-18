import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from './auth.js';

export type AuditAction =
  | 'medication.administer'
  | 'medication.create'
  | 'medication.update'
  | 'medication.delete'
  | 'resident.create'
  | 'resident.update'
  | 'resident.delete'
  | 'resident.discharge'
  | 'financial.create'
  | 'financial.update'
  | 'financial.delete'
  | 'financial.payment'
  | 'care_plan.create'
  | 'care_plan.update'
  | 'care_plan.delete'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'visitor.create'
  | 'visitor.checkout';

export function auditAction(action: AuditAction, entityType?: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthRequest;

    const originalJson = res.json.bind(res);
    res.json = function (body) {
      // Fire-and-forget audit log after response
      const entityId =
        req.params['id'] ||
        req.params['residentId'] ||
        body?.data?.id ||
        body?.id ||
        undefined;

      prisma.auditLog
        .create({
          data: {
            houseId: authReq.houseId,
            userId: authReq.userId,
            action,
            entityType: entityType ?? null,
            entityId: entityId ?? null,
            newValues: req.body ? (req.body as object) : undefined,
            pinVerified: !!(req as Request & { pinVerified?: boolean }).pinVerified,
            ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? null,
            userAgent: req.headers['user-agent'] ?? null,
          },
        })
        .catch(() => {/* non-critical */});

      return originalJson(body);
    };

    next();
  };
}
