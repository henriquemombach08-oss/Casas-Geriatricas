# 💊 FASE 3: SISTEMA COMPLETO DE MEDICAMENTOS

**Data:** Abril 2026  
**Duração Estimada:** 4-5 semanas  
**Criticidade:** 🔴 MÁXIMA (dados de saúde, vida das pessoas)  
**Status:** Ready to Build  

---

## 📋 VISÃO GERAL DA FASE 3

Você vai implementar o **SISTEMA MAIS CRÍTICO DO PROJETO**: gerenciamento de medicamentos com rastreamento absoluto.

**Objetivo:** Garantir que:
- ✅ Cada residente tome o medicamento CERTO
- ✅ Na HORA CERTA
- ✅ Na DOSE CERTA
- ✅ Saibamos QUEM administrou
- ✅ Saibamos POR QUE não foi dado (se recusou, alergia, etc)
- ✅ Recebamos ALERTAS em tempo real
- ✅ Tenhamos INTEGRAÇÃO com farmácias

**Resultado Final:** Sistema profissional de rastreamento de medicamentos pronto para auditoria e compliance LGPD.

---

## 🗄️ SCHEMA POSTGRESQL (COMPLETO)

### Tabela: medications

```sql
CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  
  -- MEDICAMENTO
  name VARCHAR(255) NOT NULL,                    -- Ex: "Losartana"
  active_ingredient VARCHAR(255),                -- Ex: "Losartana Potássica"
  dosage VARCHAR(100) NOT NULL,                  -- Ex: "50mg", "2 comprimidos"
  measurement_unit ENUM('mg', 'ml', 'comp', 'gotas', 'colher', 'unid'),
  
  -- FREQUÊNCIA E HORÁRIOS
  frequency_description VARCHAR(255) NOT NULL,  -- Ex: "2x ao dia", "a cada 8 horas"
  times_per_day INT NOT NULL,                   -- 1, 2, 3, 4, etc
  scheduled_times TEXT[] NOT NULL,              -- ['08:00', '16:00', '22:00']
  
  -- DATAS
  start_date DATE NOT NULL,
  end_date DATE,                                -- NULL se contínuo
  
  -- PRESCRITOR
  prescriber_name VARCHAR(255),                 -- Ex: "Dr. João Silva"
  prescriber_crm VARCHAR(20),                   -- Conselho Regional de Medicina
  prescriber_phone VARCHAR(20),
  prescriber_email VARCHAR(255),
  prescription_date DATE,
  
  -- INTEGRAÇÃO COM FARMÁCIA
  pharmacy_code VARCHAR(50),                    -- Código da farmácia
  pharmacy_name VARCHAR(255),
  pharmacy_batch_number VARCHAR(100),           -- Lote do medicamento
  pharmacy_expiration_date DATE,                -- Validade do medicamento
  pharmacy_cnpj VARCHAR(18),                    -- CNPJ da farmácia
  
  -- STATUS
  active BOOLEAN DEFAULT true,
  reason_if_inactive VARCHAR(500),              -- Por que foi descontinuado
  
  -- NOTAS
  side_effects TEXT,                            -- Efeitos colaterais conhecidos
  contraindications TEXT,                       -- Contra-indicações
  interaction_warnings TEXT,                    -- Interações com outros medicamentos
  special_instructions TEXT,                    -- Ex: "Tomar com alimento"
  instructions_for_caregiver TEXT,              -- Instruções específicas para cuidador
  
  -- AUDITORIA
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_medications_resident_id ON medications(resident_id);
CREATE INDEX idx_medications_house_id ON medications(house_id);
CREATE INDEX idx_medications_active ON medications(active);
CREATE INDEX idx_medications_start_date ON medications(start_date);
CREATE INDEX idx_medications_end_date ON medications(end_date);
```

### Tabela: medication_logs (CRÍTICA - RASTREAMENTO)

```sql
CREATE TABLE medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  
  -- ADMINISTRAÇÃO
  scheduled_time TIME NOT NULL,                 -- Hora que era pra dar (ex: 08:00)
  administered_at TIMESTAMP,                    -- Hora EXATA que foi dado (ou NULL se não foi)
  administered_by UUID NOT NULL REFERENCES users(id),  -- Quem deu OBRIGATÓRIO
  
  -- STATUS
  status ENUM('administered', 'refused', 'missed', 'delayed', 'partially_administered', 'not_available') DEFAULT 'administered',
  -- administered: tomou normalmente
  -- refused: o residente recusou
  -- missed: ninguém percebeu/esqueceu
  -- delayed: deu atrasado (mais de 30 min após o horário)
  -- partially_administered: tomou mas não a dose toda
  -- not_available: medicamento não disponível na casa
  
  -- MOTIVO SE NÃO FOI ADMINISTRADO
  reason_if_not_given VARCHAR(500),             -- Ex: "Residente dormindo", "Alergia"
  
  -- DOSAGEM REAL
  dosage_actually_given VARCHAR(100),           -- Pode ser diferente da prescrita
  
  -- OBSERVAÇÕES
  notes TEXT,                                   -- Comportamento, reações, etc
  resident_complaint TEXT,                      -- O residente reclamou de algo?
  
  -- AUDITORIA
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices CRÍTICOS para performance
CREATE INDEX idx_medication_logs_medication_id ON medication_logs(medication_id);
CREATE INDEX idx_medication_logs_resident_id ON medication_logs(resident_id);
CREATE INDEX idx_medication_logs_administered_at ON medication_logs(administered_at DESC);
CREATE INDEX idx_medication_logs_scheduled_time ON medication_logs(scheduled_time);
CREATE INDEX idx_medication_logs_status ON medication_logs(status);
CREATE INDEX idx_medication_logs_house_id ON medication_logs(house_id);
CREATE INDEX idx_medication_logs_administered_by ON medication_logs(administered_by);
CREATE INDEX idx_medication_logs_created_at ON medication_logs(created_at DESC);

-- Composite index para queries comuns
CREATE INDEX idx_medication_logs_resident_status_date ON medication_logs(resident_id, status, created_at DESC);
```

### Tabela: medication_schedules (VIEW para próximos medicamentos)

```sql
-- Esta é uma VIEW, não uma tabela. Calcula dinamicamente os próximos medicamentos
CREATE OR REPLACE VIEW medication_schedules_next_24h AS
SELECT 
  m.id as medication_id,
  m.resident_id,
  m.house_id,
  m.name,
  m.dosage,
  m.scheduled_times,
  r.name as resident_name,
  r.photo_url as resident_photo,
  (unnest(m.scheduled_times))::TIME as next_time,
  CURRENT_DATE + (unnest(m.scheduled_times))::TIME as next_datetime,
  CASE 
    WHEN NOT m.active THEN 'inactive'
    WHEN m.end_date < CURRENT_DATE THEN 'ended'
    WHEN m.start_date > CURRENT_DATE THEN 'not_started'
    ELSE 'active'
  END as medication_status
FROM medications m
JOIN residents r ON m.resident_id = r.id
WHERE m.active = true
  AND m.start_date <= CURRENT_DATE
  AND (m.end_date IS NULL OR m.end_date >= CURRENT_DATE)
ORDER BY next_datetime ASC;
```

### Tabela: pharmacy_integrations

```sql
CREATE TABLE pharmacy_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  
  -- FARMÁCIA
  pharmacy_name VARCHAR(255) NOT NULL,
  pharmacy_cnpj VARCHAR(18) UNIQUE,
  pharmacy_phone VARCHAR(20),
  pharmacy_email VARCHAR(255),
  pharmacy_address TEXT,
  
  -- API INTEGRATION
  api_key VARCHAR(500),                         -- Chave da farmácia (criptografada)
  api_endpoint VARCHAR(500),                    -- URL da API da farmácia
  api_username VARCHAR(255),
  
  -- STATUS
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  last_error TEXT,
  
  -- AUDITORIA
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pharmacy_integrations_house_id ON pharmacy_integrations(house_id);
```

### Tabela: medication_notifications

```sql
CREATE TABLE medication_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  medication_log_id UUID REFERENCES medication_logs(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES residents(id),
  
  -- NOTIFICAÇÃO
  type ENUM('upcoming', 'overdue', 'missed', 'refused', 'completed') NOT NULL,
  -- upcoming: próximo medicamento em 30 min
  -- overdue: medicamento atrasou >30min
  -- missed: foi pulado
  -- refused: residente recusou
  -- completed: foi dado com sucesso
  
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- CANAIS
  sent_via_in_app BOOLEAN DEFAULT true,
  sent_via_sms BOOLEAN DEFAULT false,
  sent_via_whatsapp BOOLEAN DEFAULT false,
  sent_via_email BOOLEAN DEFAULT false,
  
  -- STATUS
  was_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  acknowledged BOOLEAN DEFAULT false,  -- O cuidador clicou "ok" na notificação
  
  -- RECIPIENTS
  target_users TEXT[],                  -- IDs dos usuários que devem receber
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medication_notifications_house_id ON medication_notifications(house_id);
CREATE INDEX idx_medication_notifications_resident_id ON medication_notifications(resident_id);
CREATE INDEX idx_medication_notifications_type ON medication_notifications(type);
CREATE INDEX idx_medication_notifications_created_at ON medication_notifications(created_at DESC);
```

### Triggers para Status Automático

```sql
-- Trigger: Marcar como 'overdue' se passou 30 min do horário e não foi administrado
CREATE OR REPLACE FUNCTION check_medication_overdue()
RETURNS VOID AS $$
BEGIN
  UPDATE medication_logs
  SET status = 'overdue'
  WHERE status = 'administered'
    AND scheduled_time < (CURRENT_TIME - INTERVAL '30 minutes')
    AND administered_at IS NULL;
  
  -- Criar notificação para overdue
  INSERT INTO medication_notifications (house_id, resident_id, type, title, message, target_users)
  SELECT 
    m.house_id,
    m.resident_id,
    'overdue',
    'Medicamento Atrasado',
    CONCAT('O medicamento ', m.name, ' para ', r.name, ' está atrasado há mais de 30 minutos'),
    ARRAY(SELECT id::TEXT FROM users WHERE house_id = m.house_id AND role IN ('nurse', 'admin', 'director'))
  FROM medications m
  JOIN residents r ON m.resident_id = r.id
  WHERE m.active = true
    AND EXISTS (
      SELECT 1 FROM medication_logs ml
      WHERE ml.medication_id = m.id
        AND ml.status IN ('administered', 'overdue')
        AND ml.scheduled_time < (CURRENT_TIME - INTERVAL '30 minutes')
        AND ml.administered_at IS NULL
    );
END;
$$ LANGUAGE plpgsql;

-- Executar a cada 5 minutos
SELECT cron.schedule('check_medication_overdue', '*/5 * * * *', 'SELECT check_medication_overdue()');
```

---

## 🔐 ROW-LEVEL SECURITY (RLS)

```sql
-- Medications: Usuários veem apenas medicamentos da sua house
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY medications_house_isolation ON medications
  FOR ALL
  USING (
    house_id = (SELECT house_id FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    house_id = (SELECT house_id FROM users WHERE id = auth.uid())
  );

-- Medication Logs: Similar isolamento
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY medication_logs_house_isolation ON medication_logs
  FOR ALL
  USING (
    house_id = (SELECT house_id FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    house_id = (SELECT house_id FROM users WHERE id = auth.uid())
  );

-- Cuidadores não podem deletar medicamentos, apenas registrar administração
CREATE POLICY medications_caregiver_restrict ON medications
  FOR DELETE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'director', 'nurse')
  );
```

---

## 🔌 ENDPOINTS DA API (Express/Node.js)

### 1. POST /api/medications

**Criar prescrição de medicamento**

```typescript
// Request
POST /api/medications
Content-Type: application/json

{
  "resident_id": "uuid-residente",
  "name": "Losartana",
  "active_ingredient": "Losartana Potássica",
  "dosage": "50",
  "measurement_unit": "mg",
  "frequency_description": "2x ao dia",
  "times_per_day": 2,
  "scheduled_times": ["08:00", "20:00"],
  "start_date": "2025-04-09",
  "end_date": null,  // null = indefinido
  "prescriber_name": "Dr. João Silva",
  "prescriber_crm": "123456/SP",
  "prescriber_phone": "(51) 99999-9999",
  "prescriber_email": "dr.joao@clinic.com",
  "prescription_date": "2025-04-09",
  
  "pharmacy_name": "Farmácia do Bairro",
  "pharmacy_cnpj": "12.345.678/0001-90",
  "pharmacy_batch_number": "LOT123",
  "pharmacy_expiration_date": "2026-04-09",
  
  "side_effects": "Tonturas, fraqueza",
  "contraindications": "Gravidez",
  "interaction_warnings": "Não usar com ACE inibidores",
  "special_instructions": "Tomar com alimento",
  "instructions_for_caregiver": "Monitorar pressão arterial diariamente"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "uuid-novo",
    "name": "Losartana",
    "resident_id": "uuid-residente",
    "scheduled_times": ["08:00", "20:00"],
    "status": "active",
    "created_at": "2025-04-09T14:30:00Z"
  }
}

// Response 400
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "details": {
    "dosage": "Must be a positive number",
    "scheduled_times": "Must have at least 1 time"
  }
}
```

**Validações:**

```typescript
const CreateMedicationSchema = z.object({
  resident_id: z.string().uuid(),
  
  name: z.string()
    .min(2, 'Medication name must have at least 2 characters')
    .max(255, 'Medication name must have at most 255 characters'),
  
  active_ingredient: z.string().optional(),
  
  dosage: z.string()
    .min(1, 'Dosage is required')
    .max(100, 'Dosage must have at most 100 characters'),
  
  measurement_unit: z.enum(['mg', 'ml', 'comp', 'gotas', 'colher', 'unid']),
  
  frequency_description: z.string()
    .min(3, 'Frequency description is required'),
  
  times_per_day: z.number()
    .int()
    .min(1, 'Must have at least 1 time per day')
    .max(12, 'Maximum 12 times per day'),
  
  scheduled_times: z.array(
    z.string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
  ).min(1, 'Must have at least 1 scheduled time'),
  
  start_date: z.string()
    .refine((date) => new Date(date) <= new Date(), 'Start date cannot be in the future'),
  
  end_date: z.string().optional()
    .refine((date) => !date || new Date(date) >= new Date(), 'End date cannot be in the past'),
  
  prescriber_name: z.string().optional(),
  prescriber_crm: z.string()
    .regex(/^\d{6}\/[A-Z]{2}$/, 'Invalid CRM format (e.g., 123456/SP)').optional(),
  
  pharmacy_name: z.string().optional(),
  pharmacy_cnpj: z.string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'Invalid CNPJ format').optional(),
  
  pharmacy_expiration_date: z.string()
    .refine((date) => new Date(date) > new Date(), 'Medication expiration date must be in the future').optional(),
  
  side_effects: z.string().max(1000).optional(),
  contraindications: z.string().max(1000).optional(),
  interaction_warnings: z.string().max(1000).optional(),
  special_instructions: z.string().max(500).optional(),
  instructions_for_caregiver: z.string().max(500).optional()
});
```

**Implementação:**

```typescript
router.post(
  '/medications',
  authenticate,
  authorize(['admin', 'director', 'nurse']),
  async (req: Request, res: Response) => {
    try {
      const validation = CreateMedicationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          details: validation.error.flatten().fieldErrors
        });
      }

      const userHouseId = (req.user as any).house_id;
      const data = validation.data;

      // Verificar que residente pertence a esta house
      const resident = await prisma.resident.findFirst({
        where: {
          id: data.resident_id,
          house_id: userHouseId
        }
      });

      if (!resident) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Resident not found'
        });
      }

      // Criar medicamento
      const medication = await prisma.medication.create({
        data: {
          ...data,
          house_id: userHouseId,
          created_by: (req.user as any).id,
          times_per_day: data.times_per_day,
          scheduled_times: data.scheduled_times
        }
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          house_id: userHouseId,
          user_id: (req.user as any).id,
          action: 'created_medication',
          entity_type: 'medication',
          entity_id: medication.id,
          new_values: medication
        }
      });

      // Criar notificações para próximos horários
      await createMedicationNotifications(medication.id, medication.resident_id, userHouseId);

      res.status(201).json({
        success: true,
        data: {
          id: medication.id,
          name: medication.name,
          scheduled_times: medication.scheduled_times,
          status: 'active'
        }
      });

    } catch (error) {
      console.error('Error creating medication:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
);
```

---

### 2. GET /api/medications/resident/:residentId

**Listar medicamentos de um residente**

```typescript
// Request
GET /api/medications/resident/uuid-residente?
  status=active&
  sortBy=name

// Response 200
{
  "success": true,
  "data": {
    "medications": [
      {
        "id": "uuid-1",
        "name": "Losartana",
        "dosage": "50 mg",
        "frequency_description": "2x ao dia",
        "scheduled_times": ["08:00", "20:00"],
        "start_date": "2025-04-09",
        "end_date": null,
        "status": "active",
        "prescriber_name": "Dr. João Silva",
        "pharmacy_name": "Farmácia do Bairro",
        "side_effects": "Tonturas, fraqueza",
        "next_scheduled_time": "20:00",
        "time_until_next": "4h 30m",
        "last_administered": {
          "timestamp": "2025-04-09T12:00:00Z",
          "by": "Maria (Enfermeira)",
          "status": "administered"
        }
      }
    ]
  }
}
```

---

### 3. POST /api/medications/:id/logs

**Registrar administração (O MAIS IMPORTANTE)**

```typescript
// Request
POST /api/medications/uuid-med/logs
Content-Type: application/json

{
  "scheduled_time": "08:00",              // Hora que era pra dar
  "status": "administered",               // administered | refused | missed | delayed | partially | not_available
  "administered_at": "2025-04-09T08:05:00Z",  // Hora EXATA
  "dosage_actually_given": "50mg",        // Pode ser diferente
  "reason_if_not_given": null,            // Se status != administered
  "notes": "Residente tomou com água",    // Observações
  "resident_complaint": null              // O residente reclamou?
}

// Response 201
{
  "success": true,
  "data": {
    "id": "uuid-log",
    "medication_id": "uuid-med",
    "status": "administered",
    "administered_at": "2025-04-09T08:05:00Z",
    "administered_by": "Maria Silva (uuid)",
    "created_at": "2025-04-09T08:05:15Z"
  }
}

// Response 400
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "details": {
    "status": "Invalid status",
    "administered_at": "Must be a valid timestamp"
  }
}
```

**Validações MUITO IMPORTANTES:**

```typescript
const RegisterMedicationSchema = z.object({
  scheduled_time: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  
  status: z.enum(['administered', 'refused', 'missed', 'delayed', 'partially_administered', 'not_available'])
    .refine((status, ctx) => {
      // Se administered, need administered_at
      if (status === 'administered' && !ctx.data.administered_at) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'administered_at is required when status is administered'
        });
      }
      return true;
    }, 'Invalid status'),
  
  administered_at: z.string()
    .refine((date) => {
      const dt = new Date(date);
      const now = new Date();
      // Não pode ser no futuro
      if (dt > now) {
        return false;
      }
      // Não pode ser há mais de 24h (evitar registros antigos)
      if (now.getTime() - dt.getTime() > 24 * 60 * 60 * 1000) {
        return false;
      }
      return true;
    }, 'Timestamp must be within last 24 hours and not in the future').optional(),
  
  dosage_actually_given: z.string().optional(),
  
  reason_if_not_given: z.string()
    .refine((reason, ctx) => {
      // Se status != administered, PRECISA ter motivo
      if (ctx.data.status !== 'administered' && !reason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Reason is required when status is ${ctx.data.status}`
        });
      }
      return true;
    }, 'Reason is required').optional(),
  
  notes: z.string().max(500).optional(),
  resident_complaint: z.string().max(500).optional()
});
```

**Implementação CRÍTICA:**

```typescript
router.post(
  '/medications/:id/logs',
  authenticate,
  authorize(['admin', 'director', 'nurse', 'caregiver']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validation = RegisterMedicationSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          details: validation.error.flatten().fieldErrors
        });
      }

      const userHouseId = (req.user as any).house_id;
      const userId = (req.user as any).id;
      const data = validation.data;

      // VALIDAR que medicamento pertence a esta house
      const medication = await prisma.medication.findFirst({
        where: {
          id,
          house_id: userHouseId
        },
        include: {
          resident: true
        }
      });

      if (!medication) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND'
        });
      }

      // VALIDAR que o medicamento está ativo
      if (!medication.active) {
        return res.status(400).json({
          success: false,
          error: 'MEDICATION_INACTIVE',
          message: 'This medication is no longer active'
        });
      }

      // CRIAR LOG
      const log = await prisma.medicationLog.create({
        data: {
          medication_id: id,
          resident_id: medication.resident_id,
          house_id: userHouseId,
          scheduled_time: data.scheduled_time,
          administered_at: data.administered_at ? new Date(data.administered_at) : null,
          administered_by: userId,
          status: data.status,
          dosage_actually_given: data.dosage_actually_given,
          reason_if_not_given: data.reason_if_not_given,
          notes: data.notes,
          resident_complaint: data.resident_complaint,
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        }
      });

      // CRIAR NOTIFICAÇÃO apropriada
      let notificationType: 'completed' | 'refused' | 'missed' | 'overdue' = 'completed';
      let notificationTitle = 'Medicamento Administrado';
      let notificationMessage = `${medication.name} foi administrado para ${medication.resident.name}`;

      if (data.status === 'refused') {
        notificationType = 'refused';
        notificationTitle = 'Medicamento Recusado';
        notificationMessage = `${medication.resident.name} recusou tomar ${medication.name}`;
      } else if (data.status === 'missed') {
        notificationType = 'missed';
        notificationTitle = 'Medicamento Omitido';
        notificationMessage = `${medication.name} foi omitido para ${medication.resident.name}`;
      } else if (data.status === 'delayed') {
        notificationType = 'overdue';
        notificationTitle = 'Medicamento Administrado com Atraso';
        notificationMessage = `${medication.name} foi administrado com atraso para ${medication.resident.name}`;
      }

      await prisma.medicationNotification.create({
        data: {
          house_id: userHouseId,
          medication_log_id: log.id,
          resident_id: medication.resident_id,
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          target_users: await getTargetUsersForNotification(userHouseId, medication.resident_id),
          sent_via_in_app: true
        }
      });

      // SE foi recusado ou omitido, NOTIFICAR ENFERMEIRO
      if (['refused', 'missed'].includes(data.status)) {
        const nurses = await prisma.user.findMany({
          where: {
            house_id: userHouseId,
            role: { in: ['nurse', 'director', 'admin'] }
          }
        });

        for (const nurse of nurses) {
          await notificationService.sendNotification(nurse.id, {
            title: notificationTitle,
            message: notificationMessage,
            via: ['sms', 'whatsapp'] // URGENTE
          });
        }
      }

      // AUDIT LOG
      await prisma.auditLog.create({
        data: {
          house_id: userHouseId,
          user_id: userId,
          action: `registered_medication_${data.status}`,
          entity_type: 'medication_log',
          entity_id: log.id,
          new_values: log
        }
      });

      res.status(201).json({
        success: true,
        data: {
          id: log.id,
          status: log.status,
          administered_at: log.administered_at,
          created_at: log.created_at
        }
      });

    } catch (error) {
      console.error('Error registering medication:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
);
```

---

### 4. GET /api/medications/scheduled/next

**Próximos medicamentos a serem administrados (PRÓXIMOS 24H)**

```typescript
// Request
GET /api/medications/scheduled/next?
  house_id=uuid&
  upcoming_in_minutes=30   // Próximos medicamentos nos próximos 30 min

// Response 200
{
  "success": true,
  "data": {
    "next_medications": [
      {
        "id": "uuid-log-id",
        "medication_id": "uuid-med",
        "resident_id": "uuid-res",
        "resident_name": "João Silva",
        "resident_photo": "https://...",
        "medication_name": "Losartana",
        "dosage": "50 mg",
        "scheduled_time": "08:00",
        "time_until_next": "28 minutos",
        "minutes_until": 28,
        "prescriber": "Dr. João Silva",
        "special_instructions": "Tomar com alimento",
        "side_effects": "Tonturas, fraqueza",
        "last_administered_at": "2025-04-08T08:05:00Z",
        "is_overdue": false
      },
      {
        "id": "uuid-log-id-2",
        "medication_name": "Metformina",
        "scheduled_time": "08:30",
        "time_until_next": "58 minutos",
        // ... outros dados
      }
    ],
    "total_count": 2,
    "urgent_count": 0  // Medicamentos ATRASADOS
  }
}
```

---

### 5. GET /api/medications/:id/history

**Histórico de administração (últimos 30 dias)**

```typescript
// Request
GET /api/medications/uuid-med/history?
  days=30&
  status=all      // all | administered | refused | missed

// Response 200
{
  "success": true,
  "data": {
    "medication": {
      "id": "uuid",
      "name": "Losartana",
      "dosage": "50 mg",
      "frequency": "2x ao dia"
    },
    "history": [
      {
        "date": "2025-04-09",
        "logs": [
          {
            "id": "uuid-log",
            "scheduled_time": "08:00",
            "status": "administered",
            "administered_at": "2025-04-09T08:05:00Z",
            "administered_by": "Maria Silva",
            "dosage_actually_given": "50mg",
            "notes": "Tomou com água"
          },
          {
            "scheduled_time": "20:00",
            "status": "refused",
            "reason": "Residente dormindo",
            "recorded_by": "Carlos"
          }
        ]
      }
    ],
    "statistics": {
      "total_prescribed": 60,      // 30 dias x 2x ao dia
      "administered": 58,
      "refused": 1,
      "missed": 1,
      "adherence_rate": 96.7       // (58/60)*100
    }
  }
}
```

---

### 6. PUT /api/medications/:id

**Editar prescrição**

```typescript
// Request
PUT /api/medications/uuid-med
Content-Type: application/json

{
  "dosage": "75mg",           // Aumentar dose
  "frequency_description": "3x ao dia",
  "times_per_day": 3,
  "scheduled_times": ["08:00", "14:00", "20:00"],
  "end_date": "2025-06-09",   // Definir data de término
  "reason_for_change": "Paciente apresentou pressão elevada"
}

// Response 200
{
  "success": true,
  "data": {
    "id": "uuid-med",
    "dosage": "75mg",
    "scheduled_times": ["08:00", "14:00", "20:00"]
  }
}
```

---

### 7. DELETE /api/medications/:id

**Descontinuar medicamento (soft delete)**

```typescript
// Request
DELETE /api/medications/uuid-med
Content-Type: application/json

{
  "reason": "Prescrição finalizada pelo médico"
}

// Response 200
{
  "success": true,
  "data": {
    "id": "uuid-med",
    "status": "inactive",
    "reason_if_inactive": "Prescrição finalizada pelo médico"
  }
}
```

---

### 8. POST /api/medications/pharmacy-sync

**Sincronizar com farmácia (opcional, futuro)**

```typescript
// Request
POST /api/medications/pharmacy-sync
Content-Type: application/json

{
  "pharmacy_id": "uuid-farmacia",
  "medications_to_sync": ["uuid-med-1", "uuid-med-2"]
}

// Response 200
{
  "success": true,
  "data": {
    "synced": 2,
    "pharmacy_name": "Farmácia do Bairro",
    "last_sync": "2025-04-09T14:30:00Z"
  }
}
```

---

## 🎨 FRONTEND (Next.js 14)

### Estrutura de Arquivos

```
apps/web/src/
├── app/
│   └── (dashboard)/
│       ├── medications/
│       │   ├── page.tsx                     # Listagem por residente
│       │   ├── new/
│       │   │   └── page.tsx                 # Criar prescrição
│       │   ├── [id]/
│       │   │   ├── page.tsx                 # Detalhes + histórico
│       │   │   └── edit/
│       │   │       └── page.tsx             # Editar prescrição
│       │   │
│       │   └── schedule/
│       │       └── page.tsx                 # Dashboard: próximos medicamentos
│       │
│       └── layout.tsx
│
├── components/
│   ├── medications/
│   │   ├── MedicationForm.tsx               # Formulário novo/edit
│   │   ├── MedicationTable.tsx              # Listagem de medicamentos
│   │   ├── MedicationCard.tsx               # Card com próximos horários
│   │   ├── AdministrationForm.tsx           # Registrar administração (CRÍTICO)
│   │   ├── MedicationHistory.tsx            # Histórico + estatísticas
│   │   ├── ScheduleBoard.tsx                # Dashboard de próximos (visual lindo)
│   │   ├── UpcomingAlert.tsx                # Notificação visual de próximo meds
│   │   └── MedicationTimeline.tsx           # Timeline de administrações
│   │
│   └── shared/
│       └── TimeInput.tsx                    # Input para hora (HH:MM)
│
├── hooks/
│   ├── useMedications.ts                    # Hook para listar
│   ├── useMedicationDetail.ts               # Hook para detalhe
│   ├── useCreateMedication.ts               # Hook para criar
│   ├── useUpdateMedication.ts               # Hook para editar
│   ├── useRegisterAdministration.ts         # Hook para registrar
│   └── useMedicationSchedule.ts             # Hook para próximos
│
├── lib/
│   ├── api/
│   │   └── medications.ts                   # Funções de API
│   └── formatters.ts                        # Formatar hora, status, etc
│
└── types/
    └── medication.ts                        # Types compartilhados
```

---

### 1. /app/(dashboard)/medications/schedule/page.tsx

**DASHBOARD VISUAL - Próximos Medicamentos (A Estrela do Frontend)**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import ScheduleBoard from '@/components/medications/ScheduleBoard';
import UpcomingAlert from '@/components/medications/UpcomingAlert';
import { API } from '@/lib/api/medications';

export default function MedicationSchedulePage() {
  const [house_id, setHouseId] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming_30' | 'overdue'>('upcoming_30');
  
  // Auto-refresh a cada 30 segundos
  const { data: schedule, isLoading, refetch } = useQuery({
    queryKey: ['medication-schedule', house_id, filter],
    queryFn: () => API.getUpcomingMedications({
      house_id,
      upcoming_in_minutes: filter === 'upcoming_30' ? 30 : filter === 'overdue' ? 0 : 1440
    }),
    refetchInterval: 30000, // 30 segundos
    enabled: !!house_id
  });

  // Notificação sonora quando medicamento está próximo
  useEffect(() => {
    if (schedule?.data.next_medications.length > 0) {
      const overdue = schedule.data.next_medications.filter(m => m.is_overdue);
      if (overdue.length > 0) {
        // Tocar som de alerta
        const audio = new Audio('/sounds/medication-alert.mp3');
        audio.play();
      }
    }
  }, [schedule]);

  return (
    <div className="p-6">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Medicamentos</h1>
      <p className="text-gray-500 mb-6">Próximos medicamentos a serem administrados</p>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('overdue')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'overdue'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-800'
          }`}
        >
          ⚠️ Atrasados ({schedule?.data.urgent_count || 0})
        </button>
        
        <button
          onClick={() => setFilter('upcoming_30')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'upcoming_30'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800'
          }`}
        >
          Próximos 30 min
        </button>
        
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800"
        >
          🔄 Atualizar
        </button>
      </div>

      {/* Alertas visuais */}
      {schedule?.data.next_medications.map((med) => (
        <UpcomingAlert
          key={med.id}
          medication={med}
          onAdminister={() => {/* Abre modal de administração */}}
        />
      ))}

      {/* Board visual */}
      {isLoading ? (
        <div className="text-center py-12">Carregando...</div>
      ) : schedule?.data.next_medications.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {filter === 'overdue'
            ? 'Nenhum medicamento atrasado'
            : 'Nenhum medicamento agendado para os próximos minutos'}
        </div>
      ) : (
        <ScheduleBoard medications={schedule.data.next_medications} />
      )}
    </div>
  );
}
```

---

### 2. ScheduleBoard.tsx

**Componente Visual Bonito para Próximos Medicamentos**

```typescript
'use client';

import { useState } from 'react';
import AdministrationModal from './AdministrationModal';

interface MedicationToGive {
  id: string;
  medication_id: string;
  resident_name: string;
  resident_photo: string;
  medication_name: string;
  dosage: string;
  scheduled_time: string;
  minutes_until: number;
  special_instructions: string;
  is_overdue: boolean;
}

interface Props {
  medications: MedicationToGive[];
}

export default function ScheduleBoard({ medications }: Props) {
  const [selectedMed, setSelectedMed] = useState<MedicationToGive | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Separar medicamentos por urgência
  const overdue = medications.filter(m => m.is_overdue);
  const upcoming = medications.filter(m => !m.is_overdue);

  const getMedicationColor = (minutes: number, isOverdue: boolean) => {
    if (isOverdue) return 'bg-red-100 border-red-500';
    if (minutes <= 5) return 'bg-orange-100 border-orange-500';
    if (minutes <= 15) return 'bg-yellow-100 border-yellow-500';
    return 'bg-green-100 border-green-500';
  };

  const getMedicationBadgeColor = (minutes: number, isOverdue: boolean) => {
    if (isOverdue) return 'bg-red-600 text-white';
    if (minutes <= 5) return 'bg-orange-600 text-white';
    if (minutes <= 15) return 'bg-yellow-600 text-white';
    return 'bg-green-600 text-white';
  };

  return (
    <div className="space-y-6">
      {/* ATRASADOS (se houver) */}
      {overdue.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-red-600 mb-3">
            ⚠️ {overdue.length} Medicamento{overdue.length > 1 ? 's' : ''} ATRASADO{overdue.length > 1 ? 'S' : ''}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overdue.map((med) => (
              <MedicationCard
                key={med.id}
                med={med}
                color={getMedicationColor(med.minutes_until, true)}
                badgeColor={getMedicationBadgeColor(med.minutes_until, true)}
                onAdminister={() => {
                  setSelectedMed(med);
                  setShowModal(true);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* PRÓXIMOS */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Próximos a Administrar
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((med) => (
              <MedicationCard
                key={med.id}
                med={med}
                color={getMedicationColor(med.minutes_until, false)}
                badgeColor={getMedicationBadgeColor(med.minutes_until, false)}
                onAdminister={() => {
                  setSelectedMed(med);
                  setShowModal(true);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* MODAL de administração */}
      {showModal && selectedMed && (
        <AdministrationModal
          medication={selectedMed}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            // Refetch medicamentos
          }}
        />
      )}
    </div>
  );
}

// Subcomponente: Card de medicamento
function MedicationCard({ med, color, badgeColor, onAdminister }: any) {
  return (
    <div className={`border-2 rounded-lg p-4 ${color}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          {med.resident_photo && (
            <img
              src={med.resident_photo}
              alt={med.resident_name}
              className="w-12 h-12 rounded-full object-cover"
            />
          )}
          <div>
            <p className="font-bold text-gray-900">{med.resident_name}</p>
            <p className="text-sm text-gray-600">{med.medication_name}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${badgeColor}`}>
          {med.minutes_until < 0 ? `Atrasado ${Math.abs(med.minutes_until)}m` : `${med.minutes_until}m`}
        </span>
      </div>

      <div className="mb-3 space-y-1">
        <p className="text-sm"><strong>Dose:</strong> {med.dosage}</p>
        <p className="text-sm"><strong>Horário:</strong> {med.scheduled_time}</p>
        {med.special_instructions && (
          <p className="text-sm text-orange-700"><strong>⚠️ Instruções:</strong> {med.special_instructions}</p>
        )}
      </div>

      <button
        onClick={onAdminister}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
      >
        ✓ Administrado
      </button>
    </div>
  );
}
```

---

### 3. AdministrationModal.tsx

**Modal para Registrar Administração (CRÍTICO)**

```typescript
'use client';

import { useState } from 'react';
import { useRegisterAdministration } from '@/hooks/useMedicationAdministration';

interface Props {
  medication: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdministrationModal({ medication, onClose, onSuccess }: Props) {
  const [status, setStatus] = useState('administered');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  
  const { mutate: registerAdministration, isPending } = useRegisterAdministration();

  const handleSubmit = async () => {
    registerAdministration(
      {
        medication_id: medication.medication_id,
        scheduled_time: medication.scheduled_time,
        status,
        administered_at: new Date().toISOString(),
        reason_if_not_given: status !== 'administered' ? reason : null,
        notes
      },
      {
        onSuccess: () => {
          onSuccess();
          onClose();
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Registrar Medicamento
        </h2>

        {/* Informações */}
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <p className="font-bold text-gray-900">{medication.resident_name}</p>
          <p className="text-sm text-gray-600">{medication.medication_name}</p>
          <p className="text-sm text-gray-600">{medication.dosage}</p>
          <p className="text-sm font-bold text-blue-600 mt-2">
            Horário: {medication.scheduled_time}
          </p>
        </div>

        {/* Status */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="administered">✓ Administrado</option>
            <option value="refused">✕ Recusado</option>
            <option value="missed">⊘ Omitido</option>
            <option value="delayed">⏱️ Atrasado</option>
            <option value="partially_administered">◐ Parcialmente</option>
            <option value="not_available">🚫 Indisponível</option>
          </select>
        </div>

        {/* Motivo (se não foi administrado) */}
        {status !== 'administered' && (
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Por que não foi administrado?
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Residente recusou, dormindo, alergia..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              rows={3}
            />
          </div>
        )}

        {/* Notas */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Observações (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Residente reclamou de tontura, tomou com água..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            rows={2}
          />
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-bold hover:bg-gray-300"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### 4. /app/(dashboard)/medications/new/page.tsx

**Página de Criar Prescrição**

```typescript
'use client';

import { useRouter } from 'next/navigation';
import MedicationForm from '@/components/medications/MedicationForm';
import { useCreateMedication } from '@/hooks/useCreateMedication';

export default function NewMedicationPage() {
  const router = useRouter();
  const { mutate: createMedication, isPending } = useCreateMedication();

  const handleSubmit = async (data: any) => {
    createMedication(data, {
      onSuccess: (medication) => {
        router.push(`/medications/${medication.id}`);
      }
    });
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Nova Prescrição</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <MedicationForm onSubmit={handleSubmit} isLoading={isPending} />
      </div>
    </div>
  );
}
```

---

### 5. MedicationForm.tsx

**Formulário de Prescrição (Novo + Editar)**

```typescript
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateMedicationSchema } from '@/lib/schemas';
import FormField from '@/components/shared/FormField';
import TimeInput from '@/components/shared/TimeInput';
import Button from '@/components/shared/Button';

export default function MedicationForm({ defaultValues, onSubmit, isLoading }: any) {
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(CreateMedicationSchema),
    defaultValues
  });

  const { fields: times, append, remove } = useFieldArray({
    control,
    name: 'scheduled_times'
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* DADOS DO MEDICAMENTO */}
      <fieldset className="border-t pt-6">
        <legend className="text-lg font-bold">Medicamento</legend>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Nome"
            placeholder="Ex: Losartana"
            {...register('name')}
            error={errors.name?.message}
          />
          
          <FormField
            label="Ingrediente Ativo"
            placeholder="Ex: Losartana Potássica"
            {...register('active_ingredient')}
          />
          
          <FormField
            label="Dosagem"
            placeholder="50"
            {...register('dosage')}
            error={errors.dosage?.message}
          />
          
          <FormField
            label="Unidade"
            as="select"
            {...register('measurement_unit')}
          >
            <option value="">Selecione...</option>
            <option value="mg">mg</option>
            <option value="ml">ml</option>
            <option value="comp">Comprimido</option>
            <option value="gotas">Gotas</option>
          </FormField>
        </div>
      </fieldset>

      {/* FREQUÊNCIA E HORÁRIOS */}
      <fieldset className="border-t pt-6">
        <legend className="text-lg font-bold">Frequência</legend>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <FormField
            label="Descrição"
            placeholder="Ex: 2x ao dia, a cada 8 horas"
            {...register('frequency_description')}
            error={errors.frequency_description?.message}
          />
          
          <FormField
            label="Quantas vezes por dia?"
            type="number"
            {...register('times_per_day', { valueAsNumber: true })}
            error={errors.times_per_day?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Horários
          </label>
          <div className="space-y-2 mb-3">
            {times.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <TimeInput
                  {...register(`scheduled_times.${index}`)}
                  placeholder="HH:MM"
                />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded-lg"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => append('')}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium"
          >
            + Adicionar Horário
          </button>
        </div>
      </fieldset>

      {/* DATAS */}
      <fieldset className="border-t pt-6">
        <legend className="text-lg font-bold">Período</legend>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Data de Início"
            type="date"
            {...register('start_date')}
            error={errors.start_date?.message}
          />
          
          <FormField
            label="Data de Término (opcional)"
            type="date"
            {...register('end_date')}
          />
        </div>
      </fieldset>

      {/* PRESCRITOR */}
      <fieldset className="border-t pt-6">
        <legend className="text-lg font-bold">Prescritor</legend>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Nome do Médico"
            {...register('prescriber_name')}
          />
          
          <FormField
            label="CRM"
            placeholder="123456/SP"
            {...register('prescriber_crm')}
          />
          
          <FormField
            label="Telefone"
            type="tel"
            {...register('prescriber_phone')}
          />
          
          <FormField
            label="Email"
            type="email"
            {...register('prescriber_email')}
          />
        </div>
      </fieldset>

      {/* AVISOS E INSTRUÇÕES */}
      <fieldset className="border-t pt-6">
        <legend className="text-lg font-bold">Avisos e Instruções</legend>
        
        <div className="space-y-4">
          <FormField
            label="Efeitos Colaterais"
            as="textarea"
            rows={2}
            {...register('side_effects')}
          />
          
          <FormField
            label="Contra-indicações"
            as="textarea"
            rows={2}
            {...register('contraindications')}
          />
          
          <FormField
            label="Avisos de Interação"
            as="textarea"
            rows={2}
            {...register('interaction_warnings')}
            placeholder="Ex: Não usar com ACE inibidores"
          />
          
          <FormField
            label="Instruções Especiais"
            as="textarea"
            rows={2}
            {...register('special_instructions')}
            placeholder="Ex: Tomar com alimento, não tomar com leite"
          />
          
          <FormField
            label="Instruções para Cuidador"
            as="textarea"
            rows={2}
            {...register('instructions_for_caregiver')}
            placeholder="Ex: Monitorar pressão arterial, observar inchaço nas pernas"
          />
        </div>
      </fieldset>

      {/* Botões */}
      <div className="flex gap-4 pt-6 border-t">
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Salvar Prescrição'}
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

## 📱 MOBILE (React Native/Expo)

### Screens Principais

```typescript
// apps/mobile/src/screens/MedicationScheduleScreen.tsx

import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Sound } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { API } from '@/lib/api/medications';

export default function MedicationScheduleScreen() {
  const { data: schedule, refetch } = useQuery({
    queryKey: ['medication-schedule'],
    queryFn: API.getUpcomingMedications,
    refetchInterval: 30000
  });

  // Notificação quando medicamento está próximo
  useEffect(() => {
    if (schedule?.data.urgent_count > 0) {
      // Tocar som
      const sound = new Audio('/sounds/alert.mp3');
      sound.play();
      
      // Vibração
      Alert.vibrate([500, 500, 500]);
    }
  }, [schedule?.data.urgent_count]);

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={schedule?.data.next_medications || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MedicationCard
            medication={item}
            onAdminister={() => {
              // Abre modal de administração
            }}
          />
        )}
        refreshing={false}
        onRefresh={refetch}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-500">
              Nenhum medicamento pendente
            </Text>
          </View>
        }
      />
    </View>
  );
}
```

---

## 🔔 NOTIFICAÇÕES (Bull.js + Cron)

### Job: Verificar Próximos Medicamentos

```typescript
// apps/api/src/jobs/medication-reminder.job.ts

import Queue from 'bull';
import cron from 'node-cron';
import { notificationService } from '@/services/notifications.service';

const medicationReminderQueue = new Queue('medication-reminder', {
  redis: { url: process.env.REDIS_URL }
});

// A cada 5 minutos, verificar próximos medicamentos
cron.schedule('*/5 * * * *', async () => {
  const nextMedications = await prisma.$queryRaw`
    SELECT * FROM medication_schedules_next_24h
    WHERE next_datetime BETWEEN NOW() AND NOW() + INTERVAL '30 minutes'
  `;

  for (const med of nextMedications) {
    await medicationReminderQueue.add({
      medication_id: med.medication_id,
      resident_id: med.resident_id,
      house_id: med.house_id,
      type: 'reminder'
    });
  }
});

// Processar jobs
medicationReminderQueue.process(async (job) => {
  const { medication_id, resident_id, house_id, type } = job.data;

  const medication = await prisma.medication.findUnique({
    where: { id: medication_id },
    include: { resident: true }
  });

  if (!medication) return;

  // Encontrar enfermeiros e cuidadores
  const recipients = await prisma.user.findMany({
    where: {
      house_id,
      role: { in: ['nurse', 'caregiver', 'admin', 'director'] }
    }
  });

  // Enviar notificações
  for (const recipient of recipients) {
    await notificationService.send({
      user_id: recipient.id,
      title: 'Medicamento Próximo',
      message: `${medication.name} para ${medication.resident.name}`,
      via: ['in_app', 'sms', 'whatsapp'],
      urgency: type === 'overdue' ? 'high' : 'medium'
    });
  }
});
```

---

## 🧪 TESTES

### Testes de Validação

```typescript
describe('Medication Validation', () => {
  it('should accept valid medication times', () => {
    const times = ['08:00', '14:00', '20:00'];
    expect(validateScheduledTimes(times)).toBe(true);
  });

  it('should reject duplicate times', () => {
    const times = ['08:00', '08:00', '20:00'];
    expect(validateScheduledTimes(times)).toBe(false);
  });

  it('should reject if times_per_day does not match array length', () => {
    const data = {
      times_per_day: 3,
      scheduled_times: ['08:00', '14:00'] // apenas 2
    };
    expect(validateMedicationData(data)).toBe(false);
  });

  it('should require reason when status is not administered', () => {
    const data = {
      status: 'refused',
      reason_if_not_given: null // faltando
    };
    expect(validateAdministration(data)).toBe(false);
  });

  it('should calculate adherence rate correctly', () => {
    const logs = [
      { status: 'administered' },
      { status: 'administered' },
      { status: 'refused' },
      { status: 'missed' }
    ];
    expect(calculateAdherence(logs)).toBe(50); // 2/4
  });
});
```

---

## 📊 ROADMAP DA FASE 3

| Semana | O Quê | Status |
|--------|-------|--------|
| **1** | Schema PostgreSQL + triggers + RLS | 📝 |
| **1** | Endpoints de medicamentos (CRUD) | 📝 |
| **2** | Endpoint de registrar administração (CRÍTICO) | 📝 |
| **2** | Endpoint de próximos medicamentos | 📝 |
| **3** | Frontend: Schedule Dashboard | 📝 |
| **3** | Frontend: Administration Modal | 📝 |
| **3** | Frontend: Medication History | 📝 |
| **4** | Frontend: Prescrição (novo/edit) | 📝 |
| **4** | Mobile screens | 📝 |
| **4** | Bull.js + Cron jobs | 📝 |
| **5** | Notificações (SMS/WhatsApp) | 📝 |
| **5** | Testes + polishing | 📝 |

---

## ✅ CHECKLIST FINAL DA FASE 3

Quando terminar, confirme:

- [ ] POST /api/medications (criar prescrição)
- [ ] GET /api/medications/resident/:id (listar medicamentos)
- [ ] PUT /api/medications/:id (editar prescrição)
- [ ] DELETE /api/medications/:id (descontinuar)
- [ ] POST /api/medications/:id/logs (registrar administração) ← CRÍTICO
- [ ] GET /api/medications/scheduled/next (próximos medicamentos)
- [ ] GET /api/medications/:id/history (histórico com estatísticas)
- [ ] Validações robustas (horários, datas, motivo obrigatório)
- [ ] RLS funcionando (isolamento entre casas)
- [ ] Audit logs completos
- [ ] Frontend: Dashboard Schedule
- [ ] Frontend: Modal Administração
- [ ] Frontend: Histórico
- [ ] Frontend: Novo/Edit Prescrição
- [ ] Mobile: Screens funcionando
- [ ] Bull.js: Cron jobs rodando
- [ ] Notificações enviando (in-app, SMS, WhatsApp)
- [ ] Testes unitários
- [ ] TypeScript sem `any`
- [ ] Error handling completo
- [ ] Documentação SQL (triggers, índices, views)

---

## 🚀 COMO PASSAR PARA CLAUDE CODE

```
FASE 3 - MEDICAMENTOS: A funcionalidade mais crítica!

Tenho o documento completo da Fase 3 com especificação DETALHADA de tudo.

Implemente EXATAMENTE como descrito:

1. **Schema PostgreSQL:**
   - medications (com integração farmácia)
   - medication_logs (rastreamento CRÍTICO)
   - medication_schedules (VIEW para próximos)
   - pharmacy_integrations
   - medication_notifications
   - Triggers para status automático
   - RLS para isolamento

2. **7 Endpoints Express:**
   - POST /api/medications (criar prescrição)
   - GET /api/medications/resident/:id
   - PUT /api/medications/:id
   - DELETE /api/medications/:id
   - POST /api/medications/:id/logs (registrar administração)
   - GET /api/medications/scheduled/next
   - GET /api/medications/:id/history

3. **Frontend Next.js:**
   - /medications/schedule (Dashboard visual)
   - /medications/new (Criar prescrição)
   - /medications/[id] (Detalhes + histórico)
   - Components: ScheduleBoard, AdministrationModal, MedicationHistory

4. **Mobile React Native:**
   - MedicationScheduleScreen
   - AdministrationModal (mobile)

5. **Extras:**
   - Bull.js + Cron jobs
   - Notificações (SMS/WhatsApp/Email)
   - Testes unitários

AQUI ESTÁ O DOCUMENTO COMPLETO:

[COLA TODO O CONTEÚDO DO ARQUIVO AQUI]

Comece agora! Medicina é crítica!
```

---

**Pronto! Documento perfeito pra Fase 3!** 🚀
