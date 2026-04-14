import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import * as AuthController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

/** Strict limiter for login — 10 attempts per 15 min per IP. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

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

router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login',    loginLimiter, validate(loginSchema), AuthController.login);
router.post('/logout',   authenticate, AuthController.logout);
router.post('/refresh-token', AuthController.refreshToken);
router.get('/me',        authenticate, AuthController.me);

export default router;
