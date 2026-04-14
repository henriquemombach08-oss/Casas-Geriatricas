# 📅🏥 FASE 4: ESCALA DE TRABALHO + GESTÃO FINANCEIRA

**Data:** Abril 2026  
**Duração Estimada:** 3-4 semanas  
**Criticidade:** 🔴 ALTA (operação + receita)  
**Status:** Ready to Build  

---

## 📋 VISÃO GERAL DA FASE 4

Você vai implementar as **duas funcionalidades que fazem o sistema rodar operacionalmente**:

### Parte A: Escala de Trabalho
- ✅ Criar escala mensal (quem trabalha em que dia/turno)
- ✅ Funcionários confirmam sua disponibilidade
- ✅ Alertas quando alguém falta
- ✅ Visualização de quem tá escalado
- ✅ Histórico de presenças

### Parte B: Gestão Financeira
- ✅ Registrar cobranças (mensalidade, extras)
- ✅ Registrar pagamentos
- ✅ Rastrear inadimplência
- ✅ Gerar NF-e automática
- ✅ Relatório de fluxo de caixa
- ✅ Dashboard financeiro

**Resultado Final:** Sistema operacional + financeiro pronto pra rodar as duas casas de verdade!

---

## 🗄️ SCHEMA POSTGRESQL (COMPLETO)

### Tabela: work_schedules

```sql
CREATE TABLE work_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  
  -- DATA E TURNO
  schedule_date DATE NOT NULL,
  shift ENUM('morning', 'afternoon', 'night', 'full_day', 'on_call') NOT NULL,
  -- morning: 07h-13h
  -- afternoon: 13h-19h
  -- night: 19h-07h (próximo dia)
  -- full_day: 07h-19h
  -- on_call: em caso de necessidade
  
  start_time TIME,                       -- Hora customizada se necessário
  end_time TIME,
  
  -- CONFIRMAÇÃO
  confirmed_by_user BOOLEAN DEFAULT false,  -- Funcionário confirmou?
  confirmed_at TIMESTAMP,
  
  -- PRESENÇA
  checked_in_at TIMESTAMP,               -- Hora que chegou
  checked_out_at TIMESTAMP,              -- Hora que saiu
  status ENUM('scheduled', 'confirmed', 'no_show', 'present', 'excused_absence') DEFAULT 'scheduled',
  -- scheduled: escala criada, aguardando confirmação
  -- confirmed: funcionário confirmou
  -- no_show: não apareceu
  -- present: veio trabalhar
  -- excused_absence: não veio mas avisou
  
  -- NOTAS
  notes TEXT,                            -- Observações do gestor
  absence_reason VARCHAR(500),           -- Por que não veio
  absence_approved BOOLEAN DEFAULT false,  -- Gestor aprovou ausência?
  
  -- AUDITORIA
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_work_schedules_user_id ON work_schedules(user_id);
CREATE INDEX idx_work_schedules_house_id ON work_schedules(house_id);
CREATE INDEX idx_work_schedules_schedule_date ON work_schedules(schedule_date);
CREATE INDEX idx_work_schedules_status ON work_schedules(status);
CREATE INDEX idx_work_schedules_house_date ON work_schedules(house_id, schedule_date DESC);

-- Constraint: Uma pessoa não pode ser escalada 2x no mesmo dia
CREATE UNIQUE INDEX idx_work_schedules_unique_per_day ON work_schedules(user_id, schedule_date)
  WHERE status IN ('scheduled', 'confirmed', 'present');
```

### Tabela: financial_records

```sql
CREATE TABLE financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  
  -- TIPO DE TRANSAÇÃO
  type ENUM('charge', 'payment', 'refund', 'adjustment', 'fine') NOT NULL,
  -- charge: cobrança (mensalidade, serviços extras)
  -- payment: pagamento recebido
  -- refund: devolução
  -- adjustment: ajuste (desconto, correção)
  -- fine: multa por atraso
  
  -- VALORES
  amount DECIMAL(10, 2) NOT NULL,
  original_amount DECIMAL(10, 2),      -- Se houver desconto/ajuste
  
  -- DESCRIÇÃO
  description VARCHAR(500) NOT NULL,   -- Ex: "Mensalidade Abril 2026"
  category ENUM('monthly_fee', 'medicine', 'supplies', 'extra_service', 'other') DEFAULT 'monthly_fee',
  
  -- DATAS
  issue_date DATE NOT NULL,            -- Data que foi gerado (cobrança/pagamento)
  due_date DATE,                       -- Data de vencimento (só pra cobranças)
  paid_date DATE,                      -- Data que foi pago (só pra pagamentos)
  
  -- PAGAMENTO
  payment_method ENUM('cash', 'check', 'bank_transfer', 'credit_card', 'debit_card', 'pix', 'boleto'),
  bank_account VARCHAR(50),            -- Ex: "0001-X, Caixa 1"
  check_number VARCHAR(20),
  
  -- STATUS
  status ENUM('pending', 'paid', 'overdue', 'partially_paid', 'canceled', 'disputed') DEFAULT 'pending',
  
  -- NF-E
  nfe_number VARCHAR(100),             -- Número da NF-e emitida
  nfe_issued_at TIMESTAMP,
  nfe_series VARCHAR(10),
  nfe_rps_number VARCHAR(20),          -- Para RPS (Recibo de Prestação de Serviço)
  
  -- REFERÊNCIA
  invoice_number VARCHAR(50),          -- Número interno da fatura (ex: "FAT-2025-001")
  reference_month DATE,                -- Mês referente (ex: "2025-04-01" para Abril)
  
  -- OBSERVAÇÕES
  notes TEXT,
  
  -- LINKS
  attachment_url VARCHAR(500),         -- URL do comprovante no Supabase Storage
  
  -- AUDITORIA
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_financial_records_resident_id ON financial_records(resident_id);
CREATE INDEX idx_financial_records_house_id ON financial_records(house_id);
CREATE INDEX idx_financial_records_status ON financial_records(status);
CREATE INDEX idx_financial_records_due_date ON financial_records(due_date);
CREATE INDEX idx_financial_records_paid_date ON financial_records(paid_date);
CREATE INDEX idx_financial_records_issue_date ON financial_records(issue_date DESC);
CREATE INDEX idx_financial_records_type ON financial_records(type);
CREATE INDEX idx_financial_records_house_month ON financial_records(house_id, reference_month DESC);
```

### Triggers Automáticos

```sql
-- Trigger: Marcar como overdue quando vencer
CREATE OR REPLACE FUNCTION check_financial_overdue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.due_date IS NOT NULL 
    AND NEW.due_date < CURRENT_DATE 
    AND NEW.status IN ('pending', 'partially_paid')
  THEN
    NEW.status := 'overdue';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_financial_overdue
BEFORE INSERT OR UPDATE ON financial_records
FOR EACH ROW
EXECUTE FUNCTION check_financial_overdue();

-- Trigger: Criar notificação quando pagamento vence
CREATE OR REPLACE FUNCTION notify_payment_due()
RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (
    house_id,
    resident_id,
    type,
    title,
    message,
    target_users
  )
  SELECT 
    f.house_id,
    f.resident_id,
    'payment_due',
    'Pagamento Vencido',
    CONCAT('Pagamento de ', r.name, ' (R$ ', f.amount, ') venceu em ', f.due_date),
    ARRAY(SELECT id::TEXT FROM users WHERE house_id = f.house_id AND role IN ('director', 'admin'))
  FROM financial_records f
  JOIN residents r ON f.resident_id = r.id
  WHERE f.status = 'overdue'
    AND f.type = 'charge'
    AND f.due_date = CURRENT_DATE - INTERVAL '1 day';  -- Notificar 1 dia após vencer
END;
$$ LANGUAGE plpgsql;

-- Executar a cada dia
SELECT cron.schedule('notify_payment_due', '0 9 * * *', 'SELECT notify_payment_due();');
```

### View: financial_summary (Dashboard)

```sql
CREATE OR REPLACE VIEW financial_summary AS
SELECT 
  h.id as house_id,
  h.name as house_name,
  COUNT(DISTINCT f.resident_id) as residents_with_charges,
  SUM(CASE WHEN f.type = 'charge' AND f.status = 'pending' THEN f.amount ELSE 0 END) as pending_amount,
  SUM(CASE WHEN f.type = 'charge' AND f.status = 'overdue' THEN f.amount ELSE 0 END) as overdue_amount,
  SUM(CASE WHEN f.type = 'payment' AND f.paid_date >= CURRENT_DATE - INTERVAL '30 days' THEN f.amount ELSE 0 END) as received_this_month,
  SUM(CASE WHEN f.type = 'charge' AND f.reference_month = DATE_TRUNC('month', CURRENT_DATE)::DATE THEN f.amount ELSE 0 END) as monthly_revenue,
  ROUND(
    100.0 * COUNT(CASE WHEN f.type = 'charge' AND f.status = 'paid' THEN 1 END) / 
    NULLIF(COUNT(CASE WHEN f.type = 'charge' THEN 1 END), 0),
    2
  ) as payment_rate
FROM houses h
LEFT JOIN financial_records f ON h.id = f.house_id
GROUP BY h.id, h.name;
```

---

## 🔐 ROW-LEVEL SECURITY (RLS)

```sql
-- Escala: Usuários veem apenas sua casa
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_schedules_house_isolation ON work_schedules
  FOR ALL
  USING (
    house_id = (SELECT house_id FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    house_id = (SELECT house_id FROM users WHERE id = auth.uid())
  );

-- Cuidadores não podem criar escala, apenas confirmar a deles
CREATE POLICY work_schedules_caregiver_restrict ON work_schedules
  FOR INSERT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'director')
  );

-- Financeiro: Similar isolamento
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY financial_records_house_isolation ON financial_records
  FOR ALL
  USING (
    house_id = (SELECT house_id FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    house_id = (SELECT house_id FROM users WHERE id = auth.uid())
  );

-- Apenas admin/director/finance podem editar financeiro
CREATE POLICY financial_records_role_restrict ON financial_records
  FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'director', 'admin_finance')
  );
```

---

## 🔌 ENDPOINTS DA API (Express/Node.js)

### ESCALA DE TRABALHO

#### 1. GET /api/schedules

**Listar escala do mês**

```typescript
// Request
GET /api/schedules?
  month=2025-04&
  house_id=uuid-opcional

// Response 200
{
  "success": true,
  "data": {
    "month": "2025-04",
    "schedules": [
      {
        "id": "uuid",
        "user_id": "uuid-maria",
        "user_name": "Maria Silva",
        "user_role": "nurse",
        "schedule_date": "2025-04-09",
        "shift": "morning",      // 07h-13h
        "start_time": "07:00",
        "end_time": "13:00",
        "status": "confirmed",
        "confirmed_at": "2025-04-08T14:30:00Z",
        "checked_in_at": "2025-04-09T07:05:00Z",
        "checked_out_at": "2025-04-09T13:10:00Z",
        "is_late": false,
        "worked_hours": 6.08
      }
    ],
    "summary": {
      "total_scheduled": 24,
      "total_confirmed": 22,
      "total_no_show": 0,
      "total_present": 20
    }
  }
}
```

**Validações:**

```typescript
const ListSchedulesSchema = z.object({
  month: z.string()
    .regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM')
    .refine((month) => {
      const [year, monthNum] = month.split('-').map(Number);
      const date = new Date(year, monthNum - 1);
      return date.getFullYear() === year && date.getMonth() === monthNum - 1;
    }, 'Invalid month'),
  
  house_id: z.string().uuid().optional()
});
```

---

#### 2. POST /api/schedules

**Criar escala para um mês**

```typescript
// Request
POST /api/schedules
Content-Type: application/json

{
  "month": "2025-04",
  "schedules": [
    {
      "user_id": "uuid-maria",
      "schedule_date": "2025-04-09",
      "shift": "morning",
      "notes": "Preferencial: segunda pela manhã"
    },
    {
      "user_id": "uuid-carlos",
      "schedule_date": "2025-04-09",
      "shift": "afternoon",
      "notes": ""
    }
  ]
}

// Response 201
{
  "success": true,
  "data": {
    "month": "2025-04",
    "created_count": 30,
    "message": "Escala criada. Notificações enviadas aos funcionários."
  }
}

// Response 400
{
  "success": false,
  "error": "SCHEDULE_CONFLICT",
  "message": "Usuário uuid-maria já está escalado para 2025-04-09 morning"
}
```

---

#### 3. PUT /api/schedules/:id/confirm

**Funcionário confirma sua disponibilidade**

```typescript
// Request
PUT /api/schedules/uuid-schedule/confirm
Content-Type: application/json

{
  "confirmed": true,     // ou false para "não confirmo"
  "notes": "Tá ok pra mim"  // opcional
}

// Response 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "confirmed",
    "confirmed_at": "2025-04-08T14:30:00Z"
  }
}

// Notificação enviada pro director se não confirmar
```

---

#### 4. POST /api/schedules/:id/check-in

**Registrar entrada**

```typescript
// Request
POST /api/schedules/uuid-schedule/check-in

// Response 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "checked_in_at": "2025-04-09T07:05:00Z",
    "status": "present",
    "expected_time": "07:00",
    "is_late": false,
    "message": "Check-in registrado com sucesso"
  }
}

// Response 400 se já fez check-in
```

---

#### 5. POST /api/schedules/:id/check-out

**Registrar saída**

```typescript
// Request
POST /api/schedules/uuid-schedule/check-out

// Response 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "checked_out_at": "2025-04-09T13:10:00Z",
    "worked_hours": 6.08,
    "expected_hours": 6,
    "extra_hours": 0.08
  }
}
```

---

#### 6. PUT /api/schedules/:id/absence

**Registrar ausência (só diretor)**

```typescript
// Request
PUT /api/schedules/uuid-schedule/absence
Content-Type: application/json

{
  "reason": "Licença médica",
  "approved": true,
  "notes": "Apresentou atestado"
}

// Response 200
{
  "success": true,
  "data": {
    "status": "excused_absence",
    "approved": true
  }
}
```

---

### GESTÃO FINANCEIRA

#### 7. POST /api/financial

**Registrar cobrança/pagamento**

```typescript
// Request (Cobrança)
POST /api/financial
Content-Type: application/json

{
  "resident_id": "uuid-residente",
  "type": "charge",
  "amount": 3000.00,
  "description": "Mensalidade Abril 2026",
  "category": "monthly_fee",
  "issue_date": "2025-04-01",
  "due_date": "2025-04-10",
  "reference_month": "2025-04-01"
}

// Request (Pagamento)
POST /api/financial

{
  "resident_id": "uuid-residente",
  "type": "payment",
  "amount": 3000.00,
  "description": "Pagamento da mensalidade",
  "issue_date": "2025-04-09",
  "paid_date": "2025-04-09",
  "payment_method": "bank_transfer",
  "bank_account": "0001-X, Caixa 1",
  "reference_month": "2025-04-01"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "charge",
    "amount": 3000.00,
    "status": "pending",
    "invoice_number": "FAT-2026-001",
    "created_at": "2025-04-01T10:00:00Z"
  }
}
```

**Validações:**

```typescript
const CreateFinancialSchema = z.object({
  resident_id: z.string().uuid(),
  
  type: z.enum(['charge', 'payment', 'refund', 'adjustment', 'fine']),
  
  amount: z.number()
    .positive('Amount must be positive')
    .max(1000000, 'Amount too large'),
  
  description: z.string()
    .min(5, 'Description must have at least 5 characters')
    .max(500),
  
  issue_date: z.string()
    .refine((date) => new Date(date) <= new Date(), 'Issue date cannot be in the future'),
  
  due_date: z.string().optional()
    .refine((date) => !date || new Date(date) >= new Date(), 'Due date cannot be in the past'),
  
  payment_method: z.enum(['cash', 'check', 'bank_transfer', 'credit_card', 'debit_card', 'pix', 'boleto']).optional(),
  
  reference_month: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD (first day of month)')
});
```

---

#### 8. GET /api/financial/resident/:id

**Histórico financeiro de um residente**

```typescript
// Request
GET /api/financial/resident/uuid-residente?
  months=3&          // Últimos 3 meses
  status=all         // pending, paid, overdue, all

// Response 200
{
  "success": true,
  "data": {
    "resident": {
      "id": "uuid",
      "name": "João Silva",
      "cpf": "123.456.789-00"
    },
    "records": [
      {
        "id": "uuid",
        "type": "charge",
        "amount": 3000.00,
        "description": "Mensalidade Abril 2026",
        "issue_date": "2025-04-01",
        "due_date": "2025-04-10",
        "status": "overdue",
        "days_overdue": 5,
        "invoice_number": "FAT-2026-001"
      },
      {
        "id": "uuid",
        "type": "payment",
        "amount": 3000.00,
        "description": "Pagamento da mensalidade",
        "paid_date": "2025-04-09",
        "status": "paid",
        "payment_method": "bank_transfer"
      }
    ],
    "summary": {
      "total_charges": 9000.00,
      "total_paid": 6000.00,
      "total_pending": 3000.00,
      "total_overdue": 0.00,
      "payment_rate": 66.7  // %
    }
  }
}
```

---

#### 9. GET /api/financial/summary

**Dashboard financeiro da casa**

```typescript
// Request
GET /api/financial/summary?house_id=uuid

// Response 200
{
  "success": true,
  "data": {
    "month": "2025-04",
    "residents_with_charges": 40,
    "pending_amount": 12000.00,
    "overdue_amount": 5000.00,
    "received_this_month": 45000.00,
    "monthly_revenue": 120000.00,
    "payment_rate": 75.3,
    
    "top_debtors": [
      {
        "resident_name": "Maria Silva",
        "amount_overdue": 3000.00,
        "days_overdue": 5
      }
    ],
    
    "cash_flow": {
      "this_month": 45000.00,
      "last_month": 42000.00,
      "trend": "up"
    }
  }
}
```

---

#### 10. POST /api/financial/:id/generate-nfe

**Gerar NF-e para uma cobrança**

```typescript
// Request
POST /api/financial/uuid-charge/generate-nfe

// Response 200
{
  "success": true,
  "data": {
    "nfe_number": "123456789123456789",
    "nfe_series": "1",
    "nfe_issued_at": "2025-04-09T14:30:00Z",
    "pdf_url": "https://supabase.../nfe-123456789123456789.pdf",
    "xml_url": "https://supabase.../nfe-123456789123456789.xml"
  }
}
```

---

#### 11. POST /api/financial/:id/send-reminder

**Enviar SMS/WhatsApp de cobrança**

```typescript
// Request
POST /api/financial/uuid-charge/send-reminder

{
  "channels": ["sms", "whatsapp", "email"],  // opcional
  "message_template": "default"  // ou custom
}

// Response 200
{
  "success": true,
  "data": {
    "message": "Notificação enviada para Maria Silva",
    "channels_sent": ["sms", "whatsapp"]
  }
}
```

---

## 🎨 FRONTEND (Next.js 14)

### ESCALA DE TRABALHO

#### Estrutura de Arquivos

```
apps/web/src/
├── app/
│   └── (dashboard)/
│       ├── schedules/
│       │   ├── page.tsx                 # Calendário/mês
│       │   ├── [month]/
│       │   │   └── page.tsx             # Detalhes do mês
│       │   ├── new/
│       │   │   └── page.tsx             # Criar nova escala
│       │   └── confirmations/
│       │       └── page.tsx             # Funcionários pendentes
│       │
│       └── layout.tsx
│
├── components/
│   ├── schedules/
│   │   ├── ScheduleCalendar.tsx         # Calendário visual
│   │   ├── ScheduleForm.tsx             # Criar/editar
│   │   ├── ScheduleCard.tsx             # Card individual
│   │   ├── ConfirmationModal.tsx        # Confirmar disponibilidade
│   │   ├── CheckInButton.tsx            # Check-in rápido
│   │   ├── CheckOutButton.tsx           # Check-out rápido
│   │   └── ScheduleStats.tsx            # Estatísticas do mês
│   │
│   └── shared/
│       └── ShiftBadge.tsx               # Badge com turno
│
├── hooks/
│   ├── useSchedules.ts
│   ├── useCreateSchedule.ts
│   ├── useConfirmSchedule.ts
│   ├── useCheckIn.ts
│   └── useCheckOut.ts
│
└── types/
    └── schedule.ts
```

---

#### 1. /app/(dashboard)/schedules/[month]/page.tsx

**Visualizar escala do mês**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import ScheduleCalendar from '@/components/schedules/ScheduleCalendar';
import ScheduleStats from '@/components/schedules/ScheduleStats';
import { API } from '@/lib/api/schedules';

export default function ScheduleMonthPage() {
  const { month } = useParams();
  
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedules', month],
    queryFn: () => API.listSchedules(month as string)
  });

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Escala de {formatMonth(month)}</h1>
      </div>

      {/* Estatísticas */}
      <ScheduleStats summary={schedules?.summary} />

      {/* Calendário */}
      <ScheduleCalendar schedules={schedules?.schedules || []} />
    </div>
  );
}
```

---

#### 2. ScheduleCalendar.tsx

**Calendário visual com cores por status**

```typescript
'use client';

import { useState } from 'react';
import { Calendar } from '@/components/shared/Calendar';

interface Props {
  schedules: any[];
}

export default function ScheduleCalendar({ schedules }: Props) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const getSchedulesForDay = (date: Date) => {
    return schedules.filter(s => new Date(s.schedule_date).toDateString() === date.toDateString());
  };

  const getDayColor = (date: Date) => {
    const daySchedules = getSchedulesForDay(date);
    if (daySchedules.length === 0) return 'bg-gray-50';
    
    const allConfirmed = daySchedules.every(s => s.status === 'confirmed' || s.status === 'present');
    const anyNoShow = daySchedules.some(s => s.status === 'no_show');
    
    if (anyNoShow) return 'bg-red-100 border-red-300';
    if (allConfirmed) return 'bg-green-100 border-green-300';
    return 'bg-yellow-100 border-yellow-300';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <Calendar
        onSelectDay={setSelectedDay}
        renderDay={(date) => {
          const daySchedules = getSchedulesForDay(date);
          return (
            <div className={`p-2 rounded text-sm ${getDayColor(date)}`}>
              <p className="font-bold">{date.getDate()}</p>
              <p className="text-xs text-gray-600">{daySchedules.length} esc.</p>
            </div>
          );
        }}
      />

      {/* Detalhes do dia selecionado */}
      {selectedDay && (
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-bold mb-4">
            {new Date(selectedDay).toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          
          <div className="space-y-2">
            {getSchedulesForDay(selectedDay).map((schedule) => (
              <ScheduleCard key={schedule.id} schedule={schedule} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

#### 3. CheckInButton.tsx

**Botão de check-in rápido**

```typescript
'use client';

import { useCheckIn } from '@/hooks/useCheckIn';

interface Props {
  schedule_id: string;
  user_name: string;
}

export default function CheckInButton({ schedule_id, user_name }: Props) {
  const { mutate: checkIn, isPending } = useCheckIn();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleCheckIn = () => {
    checkIn(schedule_id, {
      onSuccess: () => {
        setShowConfirm(false);
        // Toast de sucesso
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700"
      >
        ✓ Check-in
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6">
            <p className="mb-4">
              Check-in de <strong>{user_name}</strong> às {new Date().toLocaleTimeString('pt-BR')}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleCheckIn}
                disabled={isPending}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg"
              >
                {isPending ? 'Confirmando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

---

### GESTÃO FINANCEIRA

#### Estrutura de Arquivos

```
apps/web/src/
├── app/
│   └── (dashboard)/
│       ├── financial/
│       │   ├── page.tsx                 # Dashboard
│       │   ├── residents/
│       │   │   ├── page.tsx             # Listar residentes com débitos
│       │   │   └── [id]/
│       │   │       └── page.tsx         # Histórico financeiro
│       │   ├── charges/
│       │   │   ├── new/
│       │   │   │   └── page.tsx         # Criar cobrança
│       │   │   └── [id]/
│       │   │       ├── page.tsx         # Detalhe da cobrança
│       │   │       └── generate-nfe/
│       │   │           └── page.tsx     # Gerar NF-e
│       │   │
│       │   └── reports/
│       │       └── page.tsx             # Relatório financeiro
│       │
│       └── layout.tsx
│
├── components/
│   ├── financial/
│   │   ├── FinancialDashboard.tsx       # Cards com métricas
│   │   ├── ChargeForm.tsx               # Criar cobrança
│   │   ├── PaymentModal.tsx             # Registrar pagamento
│   │   ├── ResidentBalanceCard.tsx      # Card de débito
│   │   ├── FinancialHistory.tsx         # Timeline de transações
│   │   ├── CashFlowChart.tsx            # Gráfico fluxo caixa
│   │   ├── PaymentReminder.tsx          # Enviar SMS/WhatsApp
│   │   └── NFEGenerator.tsx             # Gerar NF-e modal
│   │
│   └── shared/
│       ├── MoneyInput.tsx               # Input para valores
│       └── CurrencyBadge.tsx            # Badge com formatação
│
├── hooks/
│   ├── useFinancial.ts
│   ├── useCreateCharge.ts
│   ├── useRegisterPayment.ts
│   ├── useFinancialSummary.ts
│   └── useGenerateNFE.ts
│
└── types/
    └── financial.ts
```

---

#### 1. /app/(dashboard)/financial/page.tsx

**Dashboard financeiro**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import FinancialDashboard from '@/components/financial/FinancialDashboard';
import CashFlowChart from '@/components/financial/CashFlowChart';
import TopDebtors from '@/components/financial/TopDebtors';
import { API } from '@/lib/api/financial';

export default function FinancialPage() {
  const { data: summary } = useQuery({
    queryKey: ['financial-summary'],
    queryFn: API.getSummary,
    refetchInterval: 60000  // A cada 1 minuto
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>

      {/* Cards de resumo */}
      {summary && <FinancialDashboard summary={summary} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de fluxo de caixa */}
        <CashFlowChart />

        {/* Top devedores */}
        <TopDebtors />
      </div>
    </div>
  );
}
```

---

#### 2. FinancialDashboard.tsx

**Cards com métricas principais**

```typescript
'use client';

export default function FinancialDashboard({ summary }: any) {
  const cards = [
    {
      title: 'Receita do Mês',
      value: summary.monthly_revenue,
      color: 'bg-blue-100',
      icon: '💰'
    },
    {
      title: 'Recebido',
      value: summary.received_this_month,
      color: 'bg-green-100',
      icon: '✓'
    },
    {
      title: 'Pendente',
      value: summary.pending_amount,
      color: 'bg-yellow-100',
      icon: '⏳'
    },
    {
      title: 'Atrasado',
      value: summary.overdue_amount,
      color: 'bg-red-100',
      icon: '⚠️'
    },
    {
      title: 'Taxa de Pagamento',
      value: `${summary.payment_rate.toFixed(1)}%`,
      color: 'bg-purple-100',
      icon: '📊'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card.title} className={`${card.color} rounded-lg p-4`}>
          <div className="text-3xl mb-2">{card.icon}</div>
          <p className="text-sm text-gray-600">{card.title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {typeof card.value === 'number' ? formatCurrency(card.value) : card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
```

---

#### 3. ResidentBalanceCard.tsx

**Card com saldo devedor**

```typescript
'use client';

import { useState } from 'react';
import PaymentModal from './PaymentModal';

interface Props {
  resident_id: string;
  resident_name: string;
  resident_photo: string;
  pending_amount: number;
  overdue_amount: number;
  last_payment_date: Date;
}

export default function ResidentBalanceCard({
  resident_id,
  resident_name,
  resident_photo,
  pending_amount,
  overdue_amount,
  last_payment_date
}: Props) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const total_debt = pending_amount + overdue_amount;
  const has_overdue = overdue_amount > 0;

  return (
    <>
      <div className={`border-2 rounded-lg p-4 ${has_overdue ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            {resident_photo && (
              <img
                src={resident_photo}
                alt={resident_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div>
              <p className="font-bold text-gray-900">{resident_name}</p>
              <p className="text-sm text-gray-600">
                Última: {new Date(last_payment_date).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
          
          {has_overdue && (
            <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
              ATRASADO
            </span>
          )}
        </div>

        <div className="mb-4 space-y-1">
          {pending_amount > 0 && (
            <p className="text-sm">
              <span className="text-gray-600">Pendente: </span>
              <span className="font-bold">{formatCurrency(pending_amount)}</span>
            </p>
          )}
          {overdue_amount > 0 && (
            <p className="text-sm text-red-600">
              <span>Atrasado: </span>
              <span className="font-bold">{formatCurrency(overdue_amount)}</span>
            </p>
          )}
          <p className="text-lg font-bold border-t pt-2">
            Total: {formatCurrency(total_debt)}
          </p>
        </div>

        <button
          onClick={() => setShowPaymentModal(true)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
        >
          Registrar Pagamento
        </button>
      </div>

      {showPaymentModal && (
        <PaymentModal
          resident_id={resident_id}
          resident_name={resident_name}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </>
  );
}
```

---

## 📱 MOBILE (React Native/Expo)

### Screens

```typescript
// apps/mobile/src/screens/ScheduleScreen.tsx

import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { API } from '@/lib/api/schedules';
import CheckInButton from '@/components/schedules/CheckInButton';

export default function ScheduleScreen() {
  const { data: schedules, refetch } = useQuery({
    queryKey: ['my-schedules'],
    queryFn: API.getMySchedules
  });

  return (
    <View className="flex-1 bg-white">
      <Text className="text-2xl font-bold p-4">Minha Escala</Text>
      
      <FlatList
        data={schedules || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="p-4 border-b border-gray-200">
            <Text className="font-bold">
              {new Date(item.schedule_date).toLocaleDateString('pt-BR')}
            </Text>
            <Text className="text-sm text-gray-600">
              {item.shift === 'morning' && '07h-13h'}
              {item.shift === 'afternoon' && '13h-19h'}
              {item.shift === 'night' && '19h-07h'}
            </Text>
            
            {item.status === 'scheduled' && (
              <TouchableOpacity
                onPress={() => {
                  // Abre modal de confirmação
                }}
                className="mt-2 px-3 py-2 bg-blue-600 rounded"
              >
                <Text className="text-white font-bold">Confirmar</Text>
              </TouchableOpacity>
            )}
            
            {item.status === 'confirmed' && !item.checked_in_at && (
              <CheckInButton schedule_id={item.id} />
            )}
          </View>
        )}
        refreshing={false}
        onRefresh={refetch}
      />
    </View>
  );
}
```

---

## 🔔 NOTIFICAÇÕES (Bull.js + Cron)

### Job: Verificar Ausências Não Confirmadas

```typescript
// apps/api/src/jobs/schedule-confirmation.job.ts

import cron from 'node-cron';
import { notificationService } from '@/services/notifications.service';

// A cada dia às 17h, notificar funcionários que não confirmaram escala de amanhã
cron.schedule('0 17 * * *', async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const notConfirmed = await prisma.workSchedule.findMany({
    where: {
      schedule_date: {
        equals: tomorrow
      },
      confirmed_by_user: false
    },
    include: {
      user: true
    }
  });

  for (const schedule of notConfirmed) {
    await notificationService.send({
      user_id: schedule.user_id,
      title: 'Confirme sua escala',
      message: `Você está escalado para ${tomorrow.toLocaleDateString('pt-BR')} (${schedule.shift}). Confirme agora!`,
      via: ['sms', 'whatsapp']
    });
  }
});

// Notificar director se alguém não aparecer
cron.schedule('0 8 * * *', async () => {
  const today = new Date();
  
  const noShows = await prisma.workSchedule.findMany({
    where: {
      schedule_date: today,
      status: 'no_show'
    },
    include: {
      user: true,
      house: true
    }
  });

  for (const schedule of noShows) {
    const directors = await prisma.user.findMany({
      where: {
        house_id: schedule.house_id,
        role: { in: ['director', 'admin'] }
      }
    });

    for (const director of directors) {
      await notificationService.send({
        user_id: director.id,
        title: 'Funcionário Ausente',
        message: `${schedule.user.name} não apareceu para ${schedule.shift}`,
        via: ['in_app', 'sms']
      });
    }
  }
});
```

---

## 🧪 TESTES

```typescript
describe('Schedule Validation', () => {
  it('should reject duplicate schedules for same user/day', () => {
    const data = {
      user_id: 'uuid',
      schedule_date: '2025-04-09',
      shift: 'morning'
    };
    expect(validateUniqueSchedule(data)).toBe(false);
  });

  it('should calculate worked hours correctly', () => {
    const checkedIn = new Date('2025-04-09T07:00:00');
    const checkedOut = new Date('2025-04-09T13:30:00');
    expect(calculateWorkedHours(checkedIn, checkedOut)).toBe(6.5);
  });

  it('should mark as late if check-in > 5 minutes', () => {
    const scheduledTime = new Date('2025-04-09T07:00:00');
    const actualTime = new Date('2025-04-09T07:10:00');
    expect(isLate(scheduledTime, actualTime)).toBe(true);
  });
});

describe('Financial Validation', () => {
  it('should auto-mark as overdue when due date passes', () => {
    const record = {
      due_date: new Date('2025-04-05'),
      status: 'pending'
    };
    expect(shouldMarkOverdue(record)).toBe(true);
  });

  it('should calculate payment rate correctly', () => {
    const records = [
      { type: 'charge', status: 'paid' },
      { type: 'charge', status: 'paid' },
      { type: 'charge', status: 'pending' },
      { type: 'charge', status: 'overdue' }
    ];
    expect(calculatePaymentRate(records)).toBe(50); // 2/4
  });
});
```

---

## 📊 ROADMAP DA FASE 4

| Semana | O Quê | Status |
|--------|-------|--------|
| **1** | Schema + Triggers + RLS | 📝 |
| **1** | Endpoints escala (6 endpoints) | 📝 |
| **2** | Endpoints financeiro (5 endpoints) | 📝 |
| **2** | Frontend: Schedule Calendar | 📝 |
| **3** | Frontend: Check-in/Check-out | 📝 |
| **3** | Frontend: Financial Dashboard | 📝 |
| **3** | Frontend: Charge + Payment Forms | 📝 |
| **4** | Frontend: NF-e Generator | 📝 |
| **4** | Mobile screens | 📝 |
| **4** | Bull.js + Cron jobs | 📝 |
| **4** | Testes + polishing | 📝 |

---

## ✅ CHECKLIST FINAL DA FASE 4

- [ ] POST /api/schedules (criar escala)
- [ ] GET /api/schedules (listar mês)
- [ ] PUT /api/schedules/:id/confirm (confirmar)
- [ ] POST /api/schedules/:id/check-in
- [ ] POST /api/schedules/:id/check-out
- [ ] PUT /api/schedules/:id/absence
- [ ] POST /api/financial (criar cobrança/pagamento)
- [ ] GET /api/financial/resident/:id (histórico)
- [ ] GET /api/financial/summary (dashboard)
- [ ] POST /api/financial/:id/generate-nfe
- [ ] POST /api/financial/:id/send-reminder
- [ ] Frontend: Calendário visual
- [ ] Frontend: Check-in/Check-out
- [ ] Frontend: Dashboard financeiro
- [ ] Frontend: Forms de cobrança/pagamento
- [ ] Frontend: NF-e generator
- [ ] Mobile: Schedule screen
- [ ] Mobile: Financial screen
- [ ] RLS funcionando
- [ ] Audit logs
- [ ] Bull.js jobs
- [ ] Notificações (SMS/WhatsApp)
- [ ] Testes unitários
- [ ] TypeScript sem `any`

---

## 🚀 COMO PASSAR PARA CLAUDE CODE (VERSÃO NOITE)

```
🌙 FASE 4 - ESCALA + FINANCEIRO (Noite do Claude Code!)

Aqui está a especificação COMPLETA da Fase 4. 
Implemente EXATAMENTE como descrito enquanto estou dormindo.

PARTE A: ESCALA DE TRABALHO

Schema:
- work_schedules (date, shift, confirmation, check-in/out)
- Triggers automáticos
- RLS para isolamento

6 Endpoints:
- GET /api/schedules (listar mês)
- POST /api/schedules (criar)
- PUT /api/schedules/:id/confirm (confirmar disponibilidade)
- POST /api/schedules/:id/check-in (entrada)
- POST /api/schedules/:id/check-out (saída)
- PUT /api/schedules/:id/absence (registrar ausência)

Frontend:
- Calendário visual com cores por status
- Botões de check-in/check-out
- Modal de confirmação
- Estatísticas do mês

PARTE B: GESTÃO FINANCEIRA

Schema:
- financial_records (charge, payment, refund, adjustment, fine)
- Triggers para overdue automático
- View para dashboard

5 Endpoints:
- POST /api/financial (criar cobrança/pagamento)
- GET /api/financial/resident/:id (histórico)
- GET /api/financial/summary (dashboard)
- POST /api/financial/:id/generate-nfe (gerar NF-e)
- POST /api/financial/:id/send-reminder (enviar cobrança)

Frontend:
- Dashboard com cards de métricas
- Cards de residentes com débito
- Gráfico de fluxo de caixa
- Forms para cobrança/pagamento
- NF-e generator

Mobile:
- Schedule screen
- Financial screen

[COLA TODO O CONTEÚDO DO ARQUIVO AQUI]

Bom trabalho! Vou acordar amanhã e ver o resultado! 🚀
```

---

**Tá pronto pra deixar Claude Code trabalhando a noite?** 🌙💻

