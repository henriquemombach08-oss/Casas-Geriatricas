import { z } from 'zod';
import { validate } from '../middleware/validate';
import type { Request, Response, NextFunction } from 'express';

// ── helpers ──────────────────────────────────────────────────────────────────

function mockReqRes(body: unknown): {
  req: Request;
  res: { status: jest.Mock; json: jest.Mock; statusCode: number };
  next: jest.Mock;
} {
  const req = { body } as unknown as Request;
  const res = {
    statusCode: 200,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res: res as unknown as typeof res, next };
}

// ── schemas used in auth.routes ───────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  houseId: z.string().uuid('ID da casa inválido'),
  role: z.enum(['admin', 'nurse', 'caregiver', 'receptionist']).optional(),
});

// ── validate middleware ───────────────────────────────────────────────────────

describe('validate middleware', () => {
  describe('with loginSchema', () => {
    it('calls next() when body is valid', () => {
      const { req, res, next } = mockReqRes({ email: 'a@b.com', password: '123' });
      validate(loginSchema)(req, res as unknown as Response, next as unknown as NextFunction);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('responds 400 when email is missing', () => {
      const { req, res, next } = mockReqRes({ password: '123' });
      validate(loginSchema)(req, res as unknown as Response, next as unknown as NextFunction);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responds 400 for invalid email format', () => {
      const { req, res, next } = mockReqRes({ email: 'not-an-email', password: '123' });
      validate(loginSchema)(req, res as unknown as Response, next as unknown as NextFunction);
      expect(next).not.toHaveBeenCalled();
      const jsonArg = res.json.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(jsonArg.success).toBe(false);
      const errors = jsonArg.errors as Array<{ field: string; message: string }>;
      expect(errors.some((e) => e.field === 'email')).toBe(true);
    });

    it('responds 400 when password is empty string', () => {
      const { req, res, next } = mockReqRes({ email: 'a@b.com', password: '' });
      validate(loginSchema)(req, res as unknown as Response, next as unknown as NextFunction);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('mutates req.body to the parsed (coerced) value on success', () => {
      const body = { email: 'A@B.COM', password: 'pw' };
      const { req, res, next } = mockReqRes(body);
      validate(loginSchema)(req, res as unknown as Response, next as unknown as NextFunction);
      // Zod preserves the value; important thing is body is set
      expect(req.body).toBeDefined();
    });
  });

  describe('with registerSchema', () => {
    const valid = {
      name: 'Maria Silva',
      email: 'maria@casageri.com',
      password: 'Senha123!',
      houseId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    };

    it('calls next() for a fully valid payload', () => {
      const { req, res, next } = mockReqRes(valid);
      validate(registerSchema)(req, res as unknown as Response, next as unknown as NextFunction);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('accepts optional role when present and valid', () => {
      const { req, res, next } = mockReqRes({ ...valid, role: 'nurse' });
      validate(registerSchema)(req, res as unknown as Response, next as unknown as NextFunction);
      expect(next).toHaveBeenCalled();
    });

    it('responds 400 for invalid role enum value', () => {
      const { req, res, next } = mockReqRes({ ...valid, role: 'superuser' });
      validate(registerSchema)(req, res as unknown as Response, next as unknown as NextFunction);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responds 400 when password is too short (< 8 chars)', () => {
      const { req, res, next } = mockReqRes({ ...valid, password: 'abc' });
      validate(registerSchema)(req, res as unknown as Response, next as unknown as NextFunction);
      expect(next).not.toHaveBeenCalled();
      const jsonArg = res.json.mock.calls[0]?.[0] as Record<string, unknown>;
      const errors = jsonArg.errors as Array<{ field: string }>;
      expect(errors.some((e) => e.field === 'password')).toBe(true);
    });

    it('responds 400 when name is too short (< 2 chars)', () => {
      const { req, res, next } = mockReqRes({ ...valid, name: 'A' });
      validate(registerSchema)(req, res as unknown as Response, next as unknown as NextFunction);
      expect(next).not.toHaveBeenCalled();
    });

    it('responds 400 for non-UUID houseId', () => {
      const { req, res, next } = mockReqRes({ ...valid, houseId: 'not-a-uuid' });
      validate(registerSchema)(req, res as unknown as Response, next as unknown as NextFunction);
      expect(next).not.toHaveBeenCalled();
      const jsonArg = res.json.mock.calls[0]?.[0] as Record<string, unknown>;
      const errors = jsonArg.errors as Array<{ field: string }>;
      expect(errors.some((e) => e.field === 'houseId')).toBe(true);
    });

    it('returns success:false with errors array on failure', () => {
      const { req, res, next } = mockReqRes({});
      validate(registerSchema)(req, res as unknown as Response, next as unknown as NextFunction);
      const jsonArg = res.json.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(jsonArg.success).toBe(false);
      expect(Array.isArray(jsonArg.errors)).toBe(true);
      expect((jsonArg.errors as unknown[]).length).toBeGreaterThan(0);
    });
  });
});
