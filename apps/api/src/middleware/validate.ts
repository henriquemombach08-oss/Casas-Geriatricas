import type { Request, Response, NextFunction } from 'express';
import { z, type ZodSchema } from 'zod';

/**
 * Express middleware that validates req.body against a Zod schema.
 * Responds 400 with field-level errors if validation fails.
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      res.status(400).json({ success: false, message: 'Dados inválidos', errors });
      return;
    }
    req.body = result.data;
    next();
  };
}
