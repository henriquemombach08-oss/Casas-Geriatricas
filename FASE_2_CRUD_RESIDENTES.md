# 🏥 FASE 2: CRUD Completo de Residentes

**Data:** Abril 2026  
**Duração Estimada:** 3-4 semanas  
**Status:** Ready to Build  

---

## 📋 VISÃO GERAL DA FASE 2

Você vai implementar o **CRUD completo de residentes** (a base de todo o sistema). Isso inclui:

- ✅ Listagem com filtros, busca, paginação
- ✅ Criar novo residente (com validações)
- ✅ Ver detalhes (histórico médico, documentos, etc)
- ✅ Editar residente
- ✅ Soft delete (marcar como inativo, não deletar de verdade)
- ✅ Upload de fotos + documentos
- ✅ Alertas de vencimento de documentos
- ✅ Integração web + mobile

**Resultado Final:** Sistema funcional onde você consegue registrar e gerenciar residentes perfeitamente.

---

## 🗄️ SCHEMA POSTGRESQL (REVISADO)

### Tabela: residents

```sql
CREATE TABLE residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  
  -- DADOS PESSOAIS
  name VARCHAR(255) NOT NULL,
  cpf VARCHAR(11) UNIQUE NOT NULL,              -- Validar: 11 dígitos, formato correto
  rg VARCHAR(20),
  birth_date DATE NOT NULL,                     -- Calcular idade automaticamente
  gender ENUM('M', 'F', 'O') DEFAULT 'M',
  marital_status ENUM('single', 'married', 'widowed', 'divorced'),
  nationality VARCHAR(100) DEFAULT 'Brasileira',
  
  -- CONTATO
  phone VARCHAR(20),
  email VARCHAR(255),
  
  -- ENDEREÇO
  address VARCHAR(500),
  address_number VARCHAR(20),
  address_complement VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),                         -- Validar: 8 dígitos (XXXXX-XXX)
  
  -- EMERGÊNCIA
  emergency_contact_name VARCHAR(255) NOT NULL,
  emergency_contact_phone VARCHAR(20) NOT NULL,
  emergency_contact_relationship VARCHAR(100), -- filho, neto, amigo, etc
  emergency_contact_email VARCHAR(255),
  
  -- SAÚDE
  medical_history JSONB DEFAULT '{}',           -- Ver estrutura abaixo
  blood_type ENUM('O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'unknown'),
  
  -- FOTOS E DOCS
  photo_url VARCHAR(500),                       -- Supabase Storage
  photo_updated_at TIMESTAMP,
  
  -- STATUS
  admission_date DATE NOT NULL,
  discharge_date DATE,
  status ENUM('active', 'inactive', 'discharged') DEFAULT 'active',
  reason_if_inactive VARCHAR(500),              -- motivo de inatividade
  
  -- NOTAS
  notes TEXT,
  special_needs TEXT,                           -- Restrições, alergias críticas, etc
  
  -- AUDITORIA
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_residents_house_id ON residents(house_id);
CREATE INDEX idx_residents_cpf ON residents(cpf);
CREATE INDEX idx_residents_status ON residents(status);
CREATE INDEX idx_residents_admission_date ON residents(admission_date DESC);
CREATE INDEX idx_residents_created_at ON residents(created_at DESC);
```

### Tabela: residents_medical_history

A coluna `medical_history` é JSONB com esta estrutura:

```json
{
  "allergies": [
    {
      "id": "uuid",
      "allergen": "Penicilina",
      "severity": "severe",      // mild, moderate, severe
      "reaction": "Anafilaxia",
      "added_date": "2024-01-15",
      "added_by_user_id": "uuid"
    }
  ],
  "surgeries": [
    {
      "id": "uuid",
      "name": "Bypass Coronário",
      "date": "2020-05-10",
      "hospital": "Hospital Geral",
      "surgeon": "Dr. Silva",
      "complications": "Nenhuma",
      "notes": "Recuperação excelente"
    }
  ],
  "conditions": [
    {
      "id": "uuid",
      "name": "Hipertensão",
      "diagnosed_date": "2015-03-20",
      "status": "active",        // active, controlled, resolved
      "treatment": "Losartana 50mg",
      "notes": "Controlada"
    }
  ],
  "last_checkup": {
    "date": "2025-01-10",
    "doctor": "Dra. Maria",
    "clinic": "Clínica do Coração",
    "findings": "PA normal, frequência cardíaca normal"
  }
}
```

### Tabela: documents

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  
  -- DOCUMENTO
  type ENUM('rg', 'cpf', 'driver_license', 'passport', 'medical_report', 'insurance', 'other') NOT NULL,
  name VARCHAR(255),                            -- Ex: "RG - Frente"
  description VARCHAR(500),
  
  -- ARQUIVO
  file_url VARCHAR(500) NOT NULL,               -- Supabase Storage
  file_size INT,                                -- em bytes
  file_type VARCHAR(50),                        -- 'pdf', 'jpg', 'png', etc
  
  -- VALIDADE
  issue_date DATE,
  expires_at DATE,
  is_expired BOOLEAN DEFAULT false,
  
  -- UPLOAD
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- METADATA
  notes VARCHAR(500),
  status ENUM('valid', 'expiring_soon', 'expired') DEFAULT 'valid'
);

-- Índices
CREATE INDEX idx_documents_resident_id ON documents(resident_id);
CREATE INDEX idx_documents_expires_at ON documents(expires_at);
CREATE INDEX idx_documents_is_expired ON documents(is_expired);
CREATE INDEX idx_documents_house_id ON documents(house_id);
```

### Alertas de Documentos Vencidos

```sql
-- Trigger: Marcar documento como expirado quando vencer
CREATE OR REPLACE FUNCTION check_document_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < CURRENT_DATE THEN
    NEW.is_expired := true;
    NEW.status := 'expired';
  ELSIF NEW.expires_at IS NOT NULL AND NEW.expires_at <= CURRENT_DATE + INTERVAL '7 days' THEN
    NEW.status := 'expiring_soon';
  ELSE
    NEW.status := 'valid';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_document_expiry
BEFORE INSERT OR UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION check_document_expiry();
```

---

## 🔐 ROW-LEVEL SECURITY (RLS)

### Residents

```sql
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;

-- Usuários só veem residentes da sua house_id
CREATE POLICY residents_house_isolation ON residents
  FOR ALL
  USING (
    house_id = (
      SELECT house_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    house_id = (
      SELECT house_id FROM users WHERE id = auth.uid()
    )
  );

-- Cuidadores não podem deletar, apenas ver/editar
CREATE POLICY residents_caregiver_restrict ON residents
  FOR DELETE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'director', 'nurse')
  );
```

### Documents

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_house_isolation ON documents
  FOR ALL
  USING (
    house_id = (
      SELECT house_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    house_id = (
      SELECT house_id FROM users WHERE id = auth.uid()
    )
  );
```

---

## 🔌 ENDPOINTS DA API (Express/Node.js)

### 1. GET /api/residents

**Listar todos os residentes com filtros, busca e paginação**

```typescript
// Request
GET /api/residents?
  page=1&
  limit=20&
  search=Maria&
  status=active&
  sortBy=name&
  sortOrder=asc

// Response 200
{
  "success": true,
  "data": {
    "residents": [
      {
        "id": "uuid-1",
        "name": "Maria Silva",
        "cpf": "123.456.789-00",
        "birth_date": "1945-05-15",
        "age": 80,
        "status": "active",
        "admission_date": "2020-01-10",
        "emergency_contact_name": "João Silva",
        "phone": "(51) 98765-4321",
        "photo_url": "https://...",
        "blood_type": "O+",
        "hasExpiredDocuments": false,
        "documentCount": 3
      },
      // ... mais residentes
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "pages": 3
    }
  }
}

// Response 400 (erro de validação)
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid page number",
  "details": {
    "page": "Must be a positive integer"
  }
}

// Response 401 (não autorizado)
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "No valid token provided"
}
```

**Implementação Backend:**

```typescript
// apps/api/src/controllers/residents.controller.ts

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// Schema de validação
const ListResidentsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'discharged']).optional(),
  sortBy: z.enum(['name', 'admission_date', 'age']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

router.get('/residents', authenticate, authorize(['admin', 'director', 'nurse', 'caregiver']), async (req: Request, res: Response) => {
  try {
    const validation = ListResidentsSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: validation.error.flatten().fieldErrors
      });
    }

    const { page, limit, search, status, sortBy, sortOrder } = validation.data;
    const skip = (page - 1) * limit;
    const userHouseId = (req.user as any).house_id;

    // Construir where clause
    const where: any = {
      house_id: userHouseId,
    };

    if (status) where.status = status;
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search } },
        { emergency_contact_name: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Query
    const [residents, total] = await Promise.all([
      prisma.resident.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder
        },
        select: {
          id: true,
          name: true,
          cpf: true,
          birth_date: true,
          status: true,
          admission_date: true,
          emergency_contact_name: true,
          phone: true,
          photo_url: true,
          blood_type: true,
          documents: {
            select: {
              id: true,
              is_expired: true
            }
          }
        }
      }),
      prisma.resident.count({ where })
    ]);

    // Transformar dados
    const formattedResidents = residents.map(resident => ({
      ...resident,
      age: calculateAge(resident.birth_date),
      cpf: formatCPF(resident.cpf),
      hasExpiredDocuments: resident.documents.some(doc => doc.is_expired),
      documentCount: resident.documents.length,
      documents: undefined // não retornar detalhes aqui
    }));

    res.json({
      success: true,
      data: {
        residents: formattedResidents,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error listing residents:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to list residents'
    });
  }
});

// Funções auxiliares
function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export default router;
```

---

### 2. POST /api/residents

**Criar novo residente**

```typescript
// Request
POST /api/residents
Content-Type: application/json

{
  "name": "João da Silva",
  "cpf": "12345678900",              // Sem formatação
  "rg": "1234567",
  "birth_date": "1945-05-15",
  "gender": "M",
  "marital_status": "married",
  "nationality": "Brasileira",
  
  "phone": "(51) 98765-4321",
  "email": "joao@email.com",
  
  "address": "Rua das Flores",
  "address_number": "123",
  "address_complement": "Apto 45",
  "city": "Porto Alegre",
  "state": "RS",
  "zip_code": "90000-000",
  
  "emergency_contact_name": "Maria Silva",
  "emergency_contact_phone": "(51) 99876-5432",
  "emergency_contact_relationship": "filha",
  "emergency_contact_email": "maria@email.com",
  
  "blood_type": "O+",
  "admission_date": "2025-04-09",
  
  "medical_history": {
    "allergies": [
      {
        "allergen": "Penicilina",
        "severity": "severe",
        "reaction": "Anafilaxia"
      }
    ],
    "conditions": [
      {
        "name": "Hipertensão",
        "status": "active",
        "treatment": "Losartana 50mg"
      }
    ]
  },
  
  "notes": "Gosta de ler livros",
  "special_needs": "Dificuldade de audição"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "uuid-novo",
    "name": "João da Silva",
    "cpf": "123.456.789-00",
    "created_at": "2025-04-09T14:30:00Z",
    "status": "active"
  }
}

// Response 400
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid input data",
  "details": {
    "cpf": "Invalid CPF format",
    "birth_date": "Must be a valid date in the past",
    "email": "Invalid email format"
  }
}

// Response 409 (CPF já existe)
{
  "success": false,
  "error": "CONFLICT",
  "message": "A resident with this CPF already exists"
}
```

**Validações Obrigatórias:**

```typescript
const CreateResidentSchema = z.object({
  name: z.string()
    .min(3, 'Name must have at least 3 characters')
    .max(255, 'Name must have at most 255 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  
  cpf: z.string()
    .length(11, 'CPF must have exactly 11 digits')
    .regex(/^\d{11}$/, 'CPF must contain only digits')
    .refine(isValidCPF, 'Invalid CPF format'),
  
  rg: z.string().optional(),
  
  birth_date: z.string()
    .refine((date) => {
      const parsed = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - parsed.getFullYear();
      return age >= 60 && age <= 130; // Residentes devem ter 60+
    }, 'Resident must be at least 60 years old'),
  
  gender: z.enum(['M', 'F', 'O']),
  marital_status: z.enum(['single', 'married', 'widowed', 'divorced']).optional(),
  nationality: z.string().default('Brasileira'),
  
  phone: z.string().regex(/^(\d{10}|\d{11})$/, 'Invalid phone format').optional(),
  email: z.string().email().optional(),
  
  address: z.string().min(5).max(500),
  address_number: z.string().min(1).max(20),
  address_complement: z.string().max(255).optional(),
  city: z.string().min(2).max(100),
  state: z.string().length(2).regex(/^[A-Z]{2}$/),
  zip_code: z.string().regex(/^\d{5}-\d{3}$/, 'Invalid ZIP code format'),
  
  emergency_contact_name: z.string().min(3).max(255),
  emergency_contact_phone: z.string().regex(/^(\d{10}|\d{11})$/),
  emergency_contact_relationship: z.string().min(3).max(100),
  emergency_contact_email: z.string().email().optional(),
  
  blood_type: z.enum(['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'unknown']),
  
  admission_date: z.string()
    .refine((date) => new Date(date) <= new Date(), 'Admission date cannot be in the future'),
  
  medical_history: z.object({
    allergies: z.array(z.object({
      allergen: z.string(),
      severity: z.enum(['mild', 'moderate', 'severe']),
      reaction: z.string().optional()
    })).optional(),
    conditions: z.array(z.object({
      name: z.string(),
      status: z.enum(['active', 'controlled', 'resolved']),
      treatment: z.string().optional()
    })).optional()
  }).optional(),
  
  notes: z.string().max(1000).optional(),
  special_needs: z.string().max(1000).optional()
});

// Função para validar CPF
function isValidCPF(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf)) return false;
  
  // Verificar se não é sequência (11111111111, 00000000000, etc)
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  // Calcular dígito verificador
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;
  
  return true;
}
```

**Implementação:**

```typescript
router.post('/residents', authenticate, authorize(['admin', 'director', 'nurse']), async (req: Request, res: Response) => {
  try {
    const validation = CreateResidentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        details: validation.error.flatten().fieldErrors
      });
    }

    const userHouseId = (req.user as any).house_id;
    const data = validation.data;

    // Verificar se CPF já existe nesta casa
    const existingResident = await prisma.resident.findFirst({
      where: {
        cpf: data.cpf,
        house_id: userHouseId
      }
    });

    if (existingResident) {
      return res.status(409).json({
        success: false,
        error: 'CONFLICT',
        message: 'A resident with this CPF already exists'
      });
    }

    // Criar residente
    const resident = await prisma.resident.create({
      data: {
        ...data,
        house_id: userHouseId,
        created_by: (req.user as any).id,
        medical_history: data.medical_history || {}
      }
    });

    // Log para auditoria
    await prisma.auditLog.create({
      data: {
        house_id: userHouseId,
        user_id: (req.user as any).id,
        action: 'created_resident',
        entity_type: 'resident',
        entity_id: resident.id,
        new_values: resident
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: resident.id,
        name: resident.name,
        cpf: formatCPF(resident.cpf),
        created_at: resident.created_at,
        status: resident.status
      }
    });

  } catch (error) {
    console.error('Error creating resident:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
});
```

---

### 3. GET /api/residents/:id

**Ver detalhes completos do residente**

```typescript
// Request
GET /api/residents/uuid-123

// Response 200
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "name": "João da Silva",
    "cpf": "123.456.789-00",
    "rg": "1234567",
    "birth_date": "1945-05-15",
    "age": 80,
    "gender": "M",
    "marital_status": "married",
    "nationality": "Brasileira",
    
    "phone": "(51) 98765-4321",
    "email": "joao@email.com",
    
    "address": "Rua das Flores",
    "address_number": "123",
    "address_complement": "Apto 45",
    "city": "Porto Alegre",
    "state": "RS",
    "zip_code": "90000-000",
    
    "emergency_contact_name": "Maria Silva",
    "emergency_contact_phone": "(51) 99876-5432",
    "emergency_contact_relationship": "filha",
    "emergency_contact_email": "maria@email.com",
    
    "blood_type": "O+",
    "photo_url": "https://...",
    "status": "active",
    "admission_date": "2020-01-10",
    "discharge_date": null,
    
    "medical_history": {
      "allergies": [
        {
          "id": "uuid",
          "allergen": "Penicilina",
          "severity": "severe",
          "reaction": "Anafilaxia",
          "added_date": "2024-01-15"
        }
      ],
      "surgeries": [
        {
          "id": "uuid",
          "name": "Bypass Coronário",
          "date": "2020-05-10",
          "hospital": "Hospital Geral",
          "surgeon": "Dr. Silva",
          "complications": "Nenhuma"
        }
      ],
      "conditions": [
        {
          "id": "uuid",
          "name": "Hipertensão",
          "diagnosed_date": "2015-03-20",
          "status": "active",
          "treatment": "Losartana 50mg"
        }
      ],
      "last_checkup": {
        "date": "2025-01-10",
        "doctor": "Dra. Maria",
        "clinic": "Clínica do Coração"
      }
    },
    
    "documents": [
      {
        "id": "uuid",
        "type": "rg",
        "name": "RG - Frente",
        "file_url": "https://...",
        "issue_date": "2010-01-01",
        "expires_at": "2030-01-01",
        "is_expired": false,
        "status": "valid",
        "uploaded_at": "2025-01-15"
      },
      {
        "id": "uuid",
        "type": "cpf",
        "name": "CPF",
        "file_url": "https://...",
        "expires_at": null,
        "is_expired": false,
        "status": "valid",
        "uploaded_at": "2025-01-15"
      }
    ],
    
    "notes": "Gosta de ler livros",
    "special_needs": "Dificuldade de audição",
    
    "created_at": "2020-01-10T10:00:00Z",
    "updated_at": "2025-04-09T14:30:00Z",
    "created_by": "Admin User",
    "updated_by": "Nurse User"
  }
}

// Response 404
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "Resident not found"
}
```

---

### 4. PUT /api/residents/:id

**Atualizar residente**

```typescript
// Request
PUT /api/residents/uuid-123
Content-Type: application/json

{
  "phone": "(51) 98765-4321",
  "email": "novo@email.com",
  "medical_history": {
    // ... atualizar histórico
  },
  "notes": "Novo texto de notas"
}

// Response 200
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "name": "João da Silva",
    // ... dados atualizados
    "updated_at": "2025-04-09T15:00:00Z"
  }
}
```

---

### 5. DELETE /api/residents/:id

**Soft delete (marcar como inativo)**

```typescript
// Request
DELETE /api/residents/uuid-123

// Response 200
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "status": "inactive",
    "reason_if_inactive": "Residente transferido"
  }
}

// Nota: Hard delete não é permitido (GDPR/LGPD)
// Os dados ficam no banco mas marcados como inativo
```

---

### 6. POST /api/residents/:id/photo

**Upload de foto**

```typescript
// Request
POST /api/residents/uuid-123/photo
Content-Type: multipart/form-data

FormData:
  - file: <binary image file>

// Response 200
{
  "success": true,
  "data": {
    "photo_url": "https://supabase.../residents/uuid-123/photo.jpg",
    "photo_updated_at": "2025-04-09T14:30:00Z"
  }
}

// Response 400
{
  "success": false,
  "error": "INVALID_FILE",
  "message": "File must be JPEG or PNG, max 5MB"
}
```

**Validações:**
- Apenas JPEG, PNG
- Máximo 5MB
- Redimensionar para thumbnail (200x200px)
- Armazenar em Supabase Storage

**Implementação:**

```typescript
import multer from 'multer';
import sharp from 'sharp';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      cb(new Error('Only JPEG and PNG files are allowed'));
    } else {
      cb(null, true);
    }
  }
});

router.post(
  '/residents/:id/photo',
  authenticate,
  authorize(['admin', 'director', 'nurse']),
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const residentId = req.params.id;
      const userHouseId = (req.user as any).house_id;

      // Validar que residente pertence a esta house
      const resident = await prisma.resident.findFirst({
        where: {
          id: residentId,
          house_id: userHouseId
        }
      });

      if (!resident) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'NO_FILE'
        });
      }

      // Redimensionar imagem
      const resizedImage = await sharp(req.file.buffer)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 90 })
        .toBuffer();

      // Upload para Supabase Storage
      const fileName = `residents/${residentId}/photo.jpg`;
      const { data, error } = await supabase
        .storage
        .from('casas-geriatricas')
        .upload(fileName, resizedImage, {
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (error) {
        throw error;
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase
        .storage
        .from('casas-geriatricas')
        .getPublicUrl(fileName);

      // Atualizar banco
      await prisma.resident.update({
        where: { id: residentId },
        data: {
          photo_url: publicUrl,
          photo_updated_at: new Date(),
          updated_by: (req.user as any).id
        }
      });

      res.json({
        success: true,
        data: {
          photo_url: publicUrl,
          photo_updated_at: new Date()
        }
      });

    } catch (error) {
      console.error('Error uploading photo:', error);
      res.status(500).json({
        success: false,
        error: 'UPLOAD_FAILED'
      });
    }
  }
);
```

---

### 7. POST /api/residents/:id/documents

**Upload de documentos (RG, CPF, etc)**

```typescript
// Request
POST /api/residents/uuid-123/documents
Content-Type: multipart/form-data

FormData:
  - file: <binary PDF/image>
  - type: "rg"
  - name: "RG - Frente"
  - issue_date: "2010-01-01"
  - expires_at: "2030-01-01"
  - description: "Documento de identidade"

// Response 201
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "rg",
    "name": "RG - Frente",
    "file_url": "https://supabase.../documents/uuid.pdf",
    "status": "valid",
    "expires_at": "2030-01-01",
    "uploaded_at": "2025-04-09T14:30:00Z"
  }
}
```

**Validações:**
- Apenas PDF, JPEG, PNG
- Máximo 10MB
- Salvar em Supabase Storage
- Calcular automaticamente status (valid, expiring_soon, expired)

---

## 🎨 FRONTEND (Next.js 14)

### Estrutura de Arquivos

```
apps/web/src/
├── app/
│   └── (dashboard)/
│       ├── residents/
│       │   ├── page.tsx              # Listagem
│       │   ├── new/
│       │   │   └── page.tsx          # Criar novo
│       │   └── [id]/
│       │       ├── page.tsx          # Detalhes
│       │       └── edit/
│       │           └── page.tsx      # Editar
│       │
│       └── layout.tsx                # Sidebar + Navbar
│
├── components/
│   ├── residents/
│   │   ├── ResidentForm.tsx          # Formulário (novo + edit)
│   │   ├── ResidentCard.tsx          # Card de residente
│   │   ├── ResidentTable.tsx         # Tabela de listagem
│   │   ├── PhotoUpload.tsx           # Upload de foto
│   │   ├── DocumentUpload.tsx        # Upload de documentos
│   │   ├── MedicalHistory.tsx        # Visualizar histórico
│   │   ├── DocumentList.tsx          # Listar documentos
│   │   └── AlertBadge.tsx            # Badge de alerta (doc vencido)
│   │
│   └── shared/
│       ├── FormField.tsx             # Campo de input reutilizável
│       ├── Button.tsx
│       ├── Modal.tsx
│       └── Pagination.tsx
│
├── hooks/
│   ├── useResidents.ts               # Hook para listar
│   ├── useResident.ts                # Hook para detalhe
│   ├── useCreateResident.ts          # Hook para criar
│   ├── useUpdateResident.ts          # Hook para editar
│   └── useUploadPhoto.ts             # Hook para upload foto
│
├── lib/
│   ├── api/
│   │   └── residents.ts              # Funções de API
│   └── formatters.ts                 # Formatar CPF, telefone, etc
│
└── types/
    └── resident.ts                   # Types compartilhados
```

---

### 1. /app/(dashboard)/residents/page.tsx

**Página de Listagem de Residentes**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import ResidentTable from '@/components/residents/ResidentTable';
import SearchBar from '@/components/shared/SearchBar';
import Button from '@/components/shared/Button';
import Pagination from '@/components/shared/Pagination';
import { API } from '@/lib/api/residents';

export default function ResidentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'discharged'>('active');
  const [sortBy, setSortBy] = useState('name');

  const { data, isLoading, error } = useQuery({
    queryKey: ['residents', page, search, status, sortBy],
    queryFn: () => API.listResidents({
      page,
      limit: 20,
      search,
      status,
      sortBy
    })
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Residentes</h1>
        <Button href="/residents/new" variant="primary">
          + Novo Residente
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SearchBar
            placeholder="Buscar por nome, CPF ou contato..."
            value={search}
            onChange={setSearch}
          />
          
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="discharged">Transferido</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="name">Nome</option>
            <option value="admission_date">Data de Admissão</option>
            <option value="age">Idade</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="text-center py-12">Carregando...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">Erro ao carregar residentes</div>
      ) : (
        <>
          <ResidentTable residents={data?.residents || []} />
          
          <Pagination
            page={page}
            pages={data?.pagination.pages || 1}
            total={data?.pagination.total || 0}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
```

---

### 2. /app/(dashboard)/residents/new/page.tsx

**Página de Criar Novo Residente**

```typescript
'use client';

import { useRouter } from 'next/navigation';
import ResidentForm from '@/components/residents/ResidentForm';
import { useCreateResident } from '@/hooks/useCreateResident';

export default function NewResidentPage() {
  const router = useRouter();
  const { mutate: createResident, isPending } = useCreateResident();

  const handleSubmit = async (data: any) => {
    createResident(data, {
      onSuccess: (resident) => {
        // Toast de sucesso
        router.push(`/residents/${resident.id}`);
      }
    });
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Novo Residente</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <ResidentForm onSubmit={handleSubmit} isLoading={isPending} />
      </div>
    </div>
  );
}
```

---

### 3. /app/(dashboard)/residents/[id]/page.tsx

**Página de Detalhes do Residente**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { API } from '@/lib/api/residents';
import MedicalHistory from '@/components/residents/MedicalHistory';
import DocumentList from '@/components/residents/DocumentList';
import AlertBadge from '@/components/residents/AlertBadge';

export default function ResidentDetailPage() {
  const { id } = useParams();
  
  const { data: resident, isLoading } = useQuery({
    queryKey: ['resident', id],
    queryFn: () => API.getResident(id as string)
  });

  if (isLoading) return <div>Carregando...</div>;
  if (!resident) return <div>Residente não encontrado</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-start gap-6">
          {resident.photo_url && (
            <img
              src={resident.photo_url}
              alt={resident.name}
              className="w-32 h-32 rounded-lg object-cover"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{resident.name}</h1>
            <p className="text-gray-500">{resident.cpf} • {resident.age} anos</p>
            <div className="flex gap-2 mt-2">
              {resident.blood_type !== 'unknown' && (
                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                  {resident.blood_type}
                </span>
              )}
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {resident.status === 'active' ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        </div>
        <Link href={`/residents/${id}/edit`} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          Editar
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações Pessoais */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Informações Pessoais</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-sm">Telefone</p>
                <p className="font-medium">{resident.phone}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Email</p>
                <p className="font-medium">{resident.email}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Endereço</p>
                <p className="font-medium">
                  {resident.address}, {resident.address_number}
                  {resident.city && ` - ${resident.city}, ${resident.state}`}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Data de Admissão</p>
                <p className="font-medium">{new Date(resident.admission_date).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>

          {/* Contato de Emergência */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Contato de Emergência</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-sm">Nome</p>
                <p className="font-medium">{resident.emergency_contact_name}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Relação</p>
                <p className="font-medium">{resident.emergency_contact_relationship}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Telefone</p>
                <p className="font-medium">{resident.emergency_contact_phone}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Email</p>
                <p className="font-medium">{resident.emergency_contact_email}</p>
              </div>
            </div>
          </div>

          {/* Histórico Médico */}
          <MedicalHistory medical_history={resident.medical_history} />

          {/* Notas */}
          {resident.notes && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Notas</h2>
              <p className="text-gray-700">{resident.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar Direito */}
        <div className="space-y-6">
          {/* Alertas */}
          {resident.hasExpiredDocuments && (
            <AlertBadge
              type="danger"
              title="Documentos Vencidos"
              message="Um ou mais documentos estão vencidos"
            />
          )}

          {/* Documentos */}
          <DocumentList
            residentId={resident.id}
            documents={resident.documents}
          />
        </div>
      </div>
    </div>
  );
}
```

---

### 4. ResidentForm.tsx

**Componente de Formulário (Novo + Editar)**

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import FormField from '@/components/shared/FormField';
import Button from '@/components/shared/Button';

const ResidentFormSchema = z.object({
  name: z.string().min(3).max(255),
  cpf: z.string().length(11),
  birth_date: z.string(),
  // ... outros campos
});

type ResidentFormData = z.infer<typeof ResidentFormSchema>;

interface Props {
  defaultValues?: Partial<ResidentFormData>;
  onSubmit: (data: ResidentFormData) => Promise<void>;
  isLoading?: boolean;
}

export default function ResidentForm({ defaultValues, onSubmit, isLoading }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<ResidentFormData>({
    resolver: zodResolver(ResidentFormSchema),
    defaultValues
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* DADOS PESSOAIS */}
      <fieldset className="border-t pt-6">
        <legend className="text-lg font-bold">Dados Pessoais</legend>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Nome Completo"
            {...register('name')}
            error={errors.name?.message}
          />
          
          <FormField
            label="CPF"
            placeholder="00000000000"
            maxLength={11}
            {...register('cpf')}
            error={errors.cpf?.message}
          />
          
          <FormField
            label="RG"
            {...register('rg')}
          />
          
          <FormField
            label="Data de Nascimento"
            type="date"
            {...register('birth_date')}
            error={errors.birth_date?.message}
          />
        </div>
      </fieldset>

      {/* CONTATO */}
      <fieldset className="border-t pt-6">
        <legend className="text-lg font-bold">Contato</legend>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Telefone"
            placeholder="(51) 98765-4321"
            {...register('phone')}
          />
          
          <FormField
            label="Email"
            type="email"
            {...register('email')}
          />
        </div>
      </fieldset>

      {/* ENDEREÇO */}
      <fieldset className="border-t pt-6">
        <legend className="text-lg font-bold">Endereço</legend>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Rua"
            {...register('address')}
          />
          
          <FormField
            label="Número"
            {...register('address_number')}
          />
          
          <FormField
            label="Complemento"
            {...register('address_complement')}
          />
          
          <FormField
            label="Cidade"
            {...register('city')}
          />
          
          <FormField
            label="Estado"
            {...register('state')}
          />
          
          <FormField
            label="CEP"
            placeholder="00000-000"
            {...register('zip_code')}
          />
        </div>
      </fieldset>

      {/* ... mais fieldsets ... */}

      {/* Botões */}
      <div className="flex gap-4 pt-6 border-t">
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => window.history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
```

---

### 5. DocumentList.tsx

**Componente de Listagem de Documentos**

```typescript
'use client';

import { useState } from 'react';
import DocumentUpload from './DocumentUpload';
import AlertBadge from './AlertBadge';

interface Document {
  id: string;
  type: string;
  name: string;
  file_url: string;
  is_expired: boolean;
  status: 'valid' | 'expiring_soon' | 'expired';
  expires_at?: string;
  uploaded_at: string;
}

interface Props {
  residentId: string;
  documents: Document[];
}

export default function DocumentList({ residentId, documents }: Props) {
  const [showUpload, setShowUpload] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'bg-green-100 text-green-800';
      case 'expiring_soon': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'valid': return 'Válido';
      case 'expiring_soon': return 'Vencendo';
      case 'expired': return 'Vencido';
      default: return status;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Documentos ({documents.length})</h2>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {showUpload ? '✕' : '+ Upload'}
        </button>
      </div>

      {showUpload && (
        <DocumentUpload
          residentId={residentId}
          onSuccess={() => setShowUpload(false)}
        />
      )}

      <div className="space-y-3">
        {documents.length === 0 ? (
          <p className="text-gray-500">Nenhum documento enviado</p>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                  📄
                </div>
                <div>
                  <p className="font-medium text-gray-900">{doc.name}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(doc.status)}`}>
                  {getStatusLabel(doc.status)}
                </span>
                <a
                  href={doc.file_url}
                  target="_blank"
                  className="text-blue-600 hover:text-blue-800"
                >
                  Ver
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {documents.some(doc => doc.status === 'expired') && (
        <AlertBadge
          type="danger"
          title="Documentos Vencidos"
          message="Renove os documentos vencidos"
        />
      )}
    </div>
  );
}
```

---

## 📱 MOBILE (React Native/Expo)

### Estrutura

```typescript
// apps/mobile/src/screens/ResidentsListScreen.tsx

import { useQuery } from '@tanstack/react-query';
import { View, Text, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { API } from '@/lib/api/residents';

export default function ResidentsListScreen() {
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['residents-mobile', page, search],
    queryFn: () => API.listResidents({
      page,
      limit: 20,
      search
    })
  });

  return (
    <View className="flex-1 bg-white">
      <TextInput
        placeholder="Buscar residente..."
        value={search}
        onChangeText={setSearch}
        className="m-4 px-4 py-2 border border-gray-300 rounded-lg"
      />

      <FlatList
        data={data?.residents || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('ResidentDetail', { id: item.id })}
            className="p-4 border-b border-gray-200"
          >
            <Text className="font-bold text-lg">{item.name}</Text>
            <Text className="text-gray-500">{item.cpf}</Text>
          </TouchableOpacity>
        )}
        onEndReached={() => {
          if (page < (data?.pagination.pages || 1)) {
            setPage(page + 1);
          }
        }}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-500">
              {isLoading ? 'Carregando...' : 'Nenhum residente encontrado'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        onPress={() => navigation.navigate('NewResident')}
        className="absolute bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg"
      >
        <Text className="text-white text-2xl">+</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## 🧪 TESTES

### Testes de Validação (Jest + React Testing Library)

```typescript
// apps/api/src/__tests__/residents.test.ts

import { isValidCPF } from '../lib/validators';

describe('CPF Validation', () => {
  it('should accept valid CPF', () => {
    expect(isValidCPF('12345678901')).toBe(true);
  });

  it('should reject CPF with all same digits', () => {
    expect(isValidCPF('11111111111')).toBe(false);
  });

  it('should reject CPF with invalid check digits', () => {
    expect(isValidCPF('12345678900')).toBe(false);
  });

  it('should reject non-numeric CPF', () => {
    expect(isValidCPF('123456789ab')).toBe(false);
  });
});
```

---

## 🔔 NOTIFICAÇÕES (Bull.js)

### Cron Job: Alertar sobre Documentos Vencendo

```typescript
// apps/api/src/jobs/document-expiry.job.ts

import Queue from 'bull';
import cron from 'node-cron';

const documentExpiryQueue = new Queue('document-expiry', {
  redis: { url: process.env.REDIS_URL }
});

// A cada dia às 8h da manhã
cron.schedule('0 8 * * *', async () => {
  const housesWithExpiringSoon = await prisma.document.groupBy({
    by: ['house_id'],
    where: {
      expires_at: {
        gte: new Date(),
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // próximos 7 dias
      },
      is_expired: false
    }
  });

  for (const house of housesWithExpiringSoon) {
    await documentExpiryQueue.add({
      house_id: house.house_id
    });
  }
});

// Processar job
documentExpiryQueue.process(async (job) => {
  const { house_id } = job.data;

  const expiringDocs = await prisma.document.findMany({
    where: {
      house_id,
      expires_at: {
        gte: new Date(),
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    },
    include: {
      resident: true
    }
  });

  // Criar notificações
  for (const doc of expiringDocs) {
    await prisma.notification.create({
      data: {
        house_id,
        title: 'Documento Vencendo',
        message: `O documento ${doc.name} do residente ${doc.resident.name} vence em ${doc.expires_at}`,
        type: 'document_expiring',
        entity_id: doc.id
      }
    });
  }
});
```

---

## 📊 ROADMAP DA FASE 2

| Semana | O Quê | Status |
|--------|-------|--------|
| **1** | API Endpoints (GET, POST, PUT, DELETE) | 📝 |
| **1** | Validações (CPF, telefone, CEP) | 📝 |
| **2** | Upload de foto + documentos | 📝 |
| **2** | Frontend listagem + pagination | 📝 |
| **3** | Frontend formulário (novo + edit) | 📝 |
| **3** | Frontend detalhe + medical history | 📝 |
| **4** | Mobile screens | 📝 |
| **4** | Testes + polishing | 📝 |

---

## ✅ CHECKLIST DA FASE 2

Quando terminar, confirme:

- [ ] GET /api/residents (listagem com filtros)
- [ ] POST /api/residents (criar com validações)
- [ ] GET /api/residents/:id (detalhe completo)
- [ ] PUT /api/residents/:id (editar)
- [ ] DELETE /api/residents/:id (soft delete)
- [ ] POST /api/residents/:id/photo (upload foto)
- [ ] POST /api/residents/:id/documents (upload documentos)
- [ ] RLS funcionando (isolamento entre casas)
- [ ] Frontend: página de listagem
- [ ] Frontend: página de criar novo
- [ ] Frontend: página de detalhe
- [ ] Frontend: página de editar
- [ ] Mobile: screens funcionando
- [ ] Validações em client + server
- [ ] Alertas de documentos vencidos (cron job)
- [ ] Testes unitários básicos
- [ ] Erro handling completo
- [ ] TypeScript sem `any`

---

## 🚀 COMO PASSAR PARA CLAUDE CODE

Copie este texto:

```
Estou pronto para FASE 2. Tenho o documento FASE_2_CRUD_RESIDENTES.md 
com especificação completa.

Implemente exatamente como descrito:

1. **Endpoints Express (7 endpoints):**
   - GET /api/residents (com filtros)
   - POST /api/residents (criar)
   - GET /api/residents/:id (detalhe)
   - PUT /api/residents/:id (editar)
   - DELETE /api/residents/:id (soft delete)
   - POST /api/residents/:id/photo (upload)
   - POST /api/residents/:id/documents (upload)

2. **Validações:**
   - CPF (11 dígitos, validação matemática)
   - Telefone (10 ou 11 dígitos)
   - CEP (formato XXXXX-XXX)
   - Birth date (idade >= 60)
   - Email validation

3. **Frontend Next.js:**
   - /residents (listagem)
   - /residents/new (criar)
   - /residents/[id] (detalhe)
   - /residents/[id]/edit (editar)
   - Componentes reutilizáveis

4. **Mobile React Native:**
   - Same API endpoints
   - ResidentsListScreen
   - ResidentDetailScreen
   - NewResidentScreen

5. **Extras:**
   - RLS PostgreSQL
   - Audit logs
   - Bull.js cron job para alertas de documentos
   - Testes básicos

Comece agora! Envie resumo quando terminar.
```

---

**Pronto! Agora é só passar pro Claude Code!** 🚀
