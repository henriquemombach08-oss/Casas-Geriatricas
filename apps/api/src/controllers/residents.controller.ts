import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import sharp from 'sharp';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { env } from '../config/env.js';
import { writeAuditLog } from '../middleware/auditLog.js';
import {
  isValidCPF,
  formatCPF,
  calculateAge,
  getDocumentStatus,
} from '../lib/validators.js';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const listSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'discharged']).optional(),
  sortBy: z.enum(['name', 'admissionDate', 'birthDate']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const medicalHistorySchema = z.object({
  allergies: z
    .array(
      z.object({
        id: z.string().optional(),
        allergen: z.string(),
        severity: z.enum(['mild', 'moderate', 'severe']),
        reaction: z.string().optional(),
        addedDate: z.string().optional(),
      }),
    )
    .optional(),
  surgeries: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        date: z.string().optional(),
        hospital: z.string().optional(),
        surgeon: z.string().optional(),
        complications: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .optional(),
  conditions: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        diagnosedDate: z.string().optional(),
        status: z.enum(['active', 'controlled', 'resolved']),
        treatment: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .optional(),
  lastCheckup: z
    .object({
      date: z.string(),
      doctor: z.string().optional(),
      clinic: z.string().optional(),
      findings: z.string().optional(),
    })
    .optional(),
});

const createSchema = z.object({
  name: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(255)
    .regex(/^[\p{L}\s]+$/u, 'Nome só pode conter letras e espaços'),
  cpf: z
    .string()
    .length(11, 'CPF deve ter 11 dígitos')
    .regex(/^\d{11}$/, 'CPF deve conter apenas números')
    .refine(isValidCPF, 'CPF inválido'),
  rg: z.string().max(20).optional(),
  birthDate: z
    .string()
    .refine((d) => {
      const age = calculateAge(d);
      return age >= 60 && age <= 130;
    }, 'Residente deve ter no mínimo 60 anos'),
  gender: z.enum(['M', 'F', 'O']),
  maritalStatus: z.enum(['single', 'married', 'widowed', 'divorced']).optional(),
  nationality: z.string().max(100).default('Brasileira'),
  phone: z
    .string()
    .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
    .optional(),
  email: z.string().email('Email inválido').optional(),
  address: z.string().min(5).max(500).optional(),
  addressNumber: z.string().min(1).max(20).optional(),
  addressComplement: z.string().max(255).optional(),
  city: z.string().min(2).max(100).optional(),
  state: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/)
    .optional(),
  zipCode: z
    .string()
    .regex(/^\d{5}-?\d{3}$/, 'CEP inválido (formato: 00000-000)')
    .optional(),
  emergencyContactName: z.string().min(3).max(255),
  emergencyContactPhone: z
    .string()
    .regex(/^\d{10,11}$/, 'Telefone de emergência deve ter 10 ou 11 dígitos'),
  emergencyContactRelationship: z.string().min(2).max(100).optional(),
  emergencyContactEmail: z.string().email().optional(),
  bloodType: z
    .enum(['O_pos', 'O_neg', 'A_pos', 'A_neg', 'B_pos', 'B_neg', 'AB_pos', 'AB_neg', 'unknown'])
    .optional(),
  admissionDate: z
    .string()
    .refine((d) => new Date(d) <= new Date(), 'Data de admissão não pode ser no futuro'),
  medicalHistory: medicalHistorySchema.optional(),
  notes: z.string().max(1000).optional(),
  specialNeeds: z.string().max(1000).optional(),
  photoUrl: z.string().optional(),
});

// For updates, all fields are optional
const updateSchema = createSchema.partial().omit({ cpf: true });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatResident(r: {
  id: string;
  name: string;
  cpf: string;
  birthDate: Date;
  status: string;
  admissionDate: Date;
  emergencyContactName: string;
  phone: string | null;
  photoUrl: string | null;
  bloodType: string | null;
  documents?: Array<{ isExpired: boolean }>;
}) {
  return {
    ...r,
    cpf: formatCPF(r.cpf),
    age: calculateAge(r.birthDate),
    hasExpiredDocuments: r.documents?.some((d) => d.isExpired) ?? false,
    documentCount: r.documents?.length ?? 0,
    documents: undefined,
  };
}

// ─── Controllers ─────────────────────────────────────────────────────────────

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, 'Parâmetros inválidos', parsed.error.flatten().fieldErrors);
    }

    const { page, limit, search, status, sortBy, sortOrder } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      houseId: authReq.houseId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { cpf: { contains: search } },
              { emergencyContactName: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [residents, total] = await Promise.all([
      prisma.resident.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          cpf: true,
          birthDate: true,
          status: true,
          admissionDate: true,
          emergencyContactName: true,
          phone: true,
          photoUrl: true,
          bloodType: true,
          documents: { select: { id: true, isExpired: true } },
        },
      }),
      prisma.resident.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        residents: residents.map(formatResident),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const resident = await prisma.resident.findFirst({
      where: { id: req.params['id'], houseId: authReq.houseId, deletedAt: null },
      include: {
        documents: {
          orderBy: { uploadedAt: 'desc' },
          include: { uploader: { select: { id: true, name: true } } },
        },
      },
    });
    if (!resident) throw new AppError(404, 'Residente não encontrado');

    res.json({
      success: true,
      data: {
        ...resident,
        cpf: formatCPF(resident.cpf),
        age: calculateAge(resident.birthDate),
        hasExpiredDocuments: resident.documents.some((d) => d.isExpired),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'Dados inválidos', parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    // Check CPF uniqueness
    const existing = await prisma.resident.findFirst({ where: { cpf: data.cpf } });
    if (existing) throw new AppError(409, 'Já existe um residente com este CPF');

    const resident = await prisma.resident.create({
      data: {
        ...data,
        houseId: authReq.houseId,
        birthDate: new Date(data.birthDate),
        admissionDate: new Date(data.admissionDate),
        medicalHistory: (data.medicalHistory ?? {}) as object,
        createdBy: authReq.userId,
        updatedBy: authReq.userId,
      },
    });

    await writeAuditLog({
      houseId: authReq.houseId,
      userId: authReq.userId,
      action: 'created_resident',
      entityType: 'resident',
      entityId: resident.id,
      newValues: data as Record<string, unknown>,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      data: {
        id: resident.id,
        name: resident.name,
        cpf: formatCPF(resident.cpf),
        status: resident.status,
        createdAt: resident.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const existing = await prisma.resident.findFirst({
      where: { id: req.params['id'], houseId: authReq.houseId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, 'Residente não encontrado');

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'Dados inválidos', parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;
    const updated = await prisma.resident.update({
      where: { id: existing.id },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        admissionDate: data.admissionDate ? new Date(data.admissionDate) : undefined,
        medicalHistory: data.medicalHistory ? (data.medicalHistory as object) : undefined,
        updatedBy: authReq.userId,
      },
    });

    await writeAuditLog({
      houseId: authReq.houseId,
      userId: authReq.userId,
      action: 'updated_resident',
      entityType: 'resident',
      entityId: updated.id,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: data as Record<string, unknown>,
    });

    res.json({
      success: true,
      data: { ...updated, cpf: formatCPF(updated.cpf), age: calculateAge(updated.birthDate) },
    });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const { reason } = req.body as { reason?: string };

    const existing = await prisma.resident.findFirst({
      where: { id: req.params['id'], houseId: authReq.houseId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, 'Residente não encontrado');

    const updated = await prisma.resident.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        status: 'inactive',
        reasonIfInactive: reason,
        updatedBy: authReq.userId,
      },
    });

    await writeAuditLog({
      houseId: authReq.houseId,
      userId: authReq.userId,
      action: 'deactivated_resident',
      entityType: 'resident',
      entityId: existing.id,
      newValues: { status: 'inactive', reason },
    });

    res.json({
      success: true,
      data: { id: updated.id, status: updated.status, reasonIfInactive: updated.reasonIfInactive },
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    if (!req.file) throw new AppError(400, 'Arquivo não enviado');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype)) {
      throw new AppError(400, 'Apenas JPEG, PNG e WebP são aceitos');
    }
    if (req.file.size > 5 * 1024 * 1024) throw new AppError(400, 'Arquivo deve ter no máximo 5MB');

    const resident = await prisma.resident.findFirst({
      where: { id: req.params['id'], houseId: authReq.houseId, deletedAt: null },
    });
    if (!resident) throw new AppError(404, 'Residente não encontrado');

    // Resize to 400x400 cover
    const resized = await sharp(req.file.buffer)
      .resize(400, 400, { fit: 'cover', position: 'face' })
      .jpeg({ quality: 85 })
      .toBuffer();

    const path = `${authReq.houseId}/residents/${resident.id}/photo.jpg`;
    const { error } = await supabaseAdmin.storage
      .from(env.STORAGE_BUCKET_PHOTOS)
      .upload(path, resized, { contentType: 'image/jpeg', upsert: true });
    if (error) throw new AppError(500, 'Erro ao fazer upload da foto');

    const { data: urlData } = supabaseAdmin.storage
      .from(env.STORAGE_BUCKET_PHOTOS)
      .getPublicUrl(path);

    const now = new Date();
    await prisma.resident.update({
      where: { id: resident.id },
      data: { photoUrl: urlData.publicUrl, photoUpdatedAt: now, updatedBy: authReq.userId },
    });

    res.json({ success: true, data: { photoUrl: urlData.publicUrl, photoUpdatedAt: now } });
  } catch (err) {
    next(err);
  }
}

export async function listDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const resident = await prisma.resident.findFirst({
      where: { id: req.params['id'], houseId: authReq.houseId, deletedAt: null },
    });
    if (!resident) throw new AppError(404, 'Residente não encontrado');

    const documents = await prisma.document.findMany({
      where: { residentId: resident.id },
      include: { uploader: { select: { id: true, name: true } } },
      orderBy: { uploadedAt: 'desc' },
    });

    res.json({ success: true, data: documents });
  } catch (err) {
    next(err);
  }
}

export async function uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    if (!req.file) throw new AppError(400, 'Arquivo não enviado');

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      throw new AppError(400, 'Apenas PDF, JPEG e PNG são aceitos');
    }
    if (req.file.size > 10 * 1024 * 1024) throw new AppError(400, 'Arquivo deve ter no máximo 10MB');

    const resident = await prisma.resident.findFirst({
      where: { id: req.params['id'], houseId: authReq.houseId, deletedAt: null },
    });
    if (!resident) throw new AppError(404, 'Residente não encontrado');

    const body = req.body as {
      type?: string;
      name?: string;
      description?: string;
      issueDate?: string;
      expiresAt?: string;
      notes?: string;
    };
    if (!body.type) throw new AppError(400, 'Tipo do documento obrigatório');

    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    const docStatus = getDocumentStatus(expiresAt);
    const isExpired = docStatus === 'expired';

    const ext = req.file.mimetype === 'application/pdf' ? 'pdf' : 'jpg';
    const path = `${authReq.houseId}/residents/${resident.id}/docs/${body.type}-${Date.now()}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from(env.STORAGE_BUCKET_DOCUMENTS)
      .upload(path, req.file.buffer, { contentType: req.file.mimetype });
    if (error) throw new AppError(500, 'Erro ao fazer upload do documento');

    const { data: urlData } = supabaseAdmin.storage
      .from(env.STORAGE_BUCKET_DOCUMENTS)
      .getPublicUrl(path);

    const doc = await prisma.document.create({
      data: {
        residentId: resident.id,
        houseId: authReq.houseId,
        type: body.type as 'rg' | 'cpf' | 'driver_license' | 'passport' | 'medical_report' | 'insurance' | 'income_statement' | 'other',
        name: body.name ?? body.type,
        description: body.description,
        fileUrl: urlData.publicUrl,
        fileSize: req.file.size,
        fileType: ext,
        issueDate: body.issueDate ? new Date(body.issueDate) : undefined,
        expiresAt: expiresAt ?? undefined,
        isExpired,
        status: docStatus,
        uploadedBy: authReq.userId,
        notes: body.notes,
      },
    });

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
}
