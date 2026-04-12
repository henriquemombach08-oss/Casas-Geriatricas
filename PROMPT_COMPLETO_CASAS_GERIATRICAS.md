# 🏥 PROMPT COMPLETO: Sistema de Gerenciamento de Casas Geriátricas

**Data:** Abril 2026  
**Projeto:** CasaGeri - Sistema integrado para 2 casas geriátricas  
**Developer:** Você (Claude Code)  
**Stack:** Next.js 14 + Express + PostgreSQL/Supabase + React Native + TypeScript  

---

## 🎯 VISÃO GERAL DO PROJETO

Você vai construir um **sistema de gerenciamento completo** para duas casas geriátricas:
- **Casa Geriátrica Quatro Estações** (~40 residentes)
- **Cantinho da Vovó** (~10-15 residentes)

O sistema será **vendido para um familiar + sócia**. Você precisa fazer a melhor obra possível.

**Contexto importante:** Este é um projeto real, familiar, com implicações diretas na operação de duas casas de cuidado de idosos. Dados de saúde são sensíveis (LGPD). Trate com máxima seriedade.

---

## 📋 REQUISITOS CONSOLIDADOS

### Funcionalidades Críticas (MVP Obrigatório)

#### 1. **Gestão de Residentes** ✅
- CRUD completo (Web + Mobile)
- Dados: nome, data de nascimento, CPF, RG, contatos de emergência, endereço
- **Upload de documentos** (RG, CPF, comprovante de renda, etc) com vencimento
- **Foto de perfil** (thumbnail + original)
- **Histórico médico completo:**
  - Alergias
  - Cirurgias realizadas
  - Condições de saúde (diabetes, hipertensão, etc)
  - Medicamentos atuais
  - Últimas consultas
- Alertas de vencimento de documentos (CPF, RG)

#### 2. **Controle de Medicamentos** 🔴 CRÍTICO
- Criar prescrições por residente
  - Nome do medicamento
  - Dosagem (ex: "500mg")
  - Frequência (ex: "2x ao dia", "a cada 8h")
  - Horários exatos
  - Data de início e fim
  - Prescritor (médico)
- **Notificações** de próximo medicamento (in-app, SMS, WhatsApp, Email)
- **Registrar administração:**
  - ✅ QUEM administrou (obrigatório - rastreamento)
  - ✅ QUANDO foi administrado (timestamp exato)
  - ✅ QUAL medicamento
  - ❌ Motivo se não foi administrado (alergia, recusa, etc)
- Histórico de administração (últimos 30 dias no mínimo)
- **Integração com farmácias** (receituário eletrônico)
  - Poder gerar prescrições que vão direto pro sistema de farmácia
  - Rastrear se o medicamento foi retirado

#### 3. **Escala de Trabalho** 🔴 CRÍTICO
- Controlar quem trabalha em que dia/turno
- **Muito importante** para a operação
- Visualização em calendário
- Ver disponibilidade de funcionários
- Alertas de funcionários faltantes
- Histórico de presença

#### 4. **Gestão Financeira** 💰
- **Controle COMPLETO:**
  - Registrar cobrança por residente (mensal, semanal, etc)
  - Registrar recebimentos
  - Acompanhar inadimplência
  - Emitir faturas
  - Gerar recibos
  - Integração manual com banco (não automática)
- **NF-e automática:**
  - Gerar nota fiscal eletrônica para cada residente
  - Com todos os dados preenchidos
  - Pronto para emissão
- Relatórios de fluxo de caixa
- Dashboard financeiro (faturamento do mês, taxa de inadimplência, etc)

#### 5. **Relatórios** 📊
- **MUITOS e AUTOMATIZADOS:**
  - Relatório de medicamentos (quem tomou, quando, por quem)
  - Relatório de residentes (estado geral, documentos vencendo)
  - Relatório financeiro (faturamento, inadimplência, recebimentos)
  - Relatório de pessoal (escalas, presença, faltas)
  - Relatório de visitantes
- Geração automática (mensalmente, semanalmente, conforme pedido)
- Exportação em PDF/Excel
- **Histórico de 30 dias para auditoria** (últimas ações do sistema)

#### 6. **Gerenciamento de Visitantes** 👥
- Registrar visitantes/acompanhantes
- Por qual residente visitaram
- Data e hora da visita
- Contato do visitante (opcional)
- Tempo de permanência (entrada/saída)
- Restrições (ex: "não pode visitar entre 18h e 9h")

#### 7. **Alertas e Notificações** 🔔
- Vencimento de documentos (CPF, RG, etc)
- Próximo medicamento (a cada 8h, 12h, etc)
- Escala: funcionário faltando
- Financeiro: pagamento vencido
- **Canais:**
  - In-app (notificação no sistema)
  - SMS (Twilio)
  - WhatsApp (Twilio)
  - Email (Nodemailer)

---

## 🏗️ ARQUITETURA TÉCNICA

### Stack Completo

```
Frontend:
  - Next.js 14 (App Router)
  - React 18
  - Tailwind CSS
  - TypeScript
  - React Query (tanstack/query)
  - Zod (validação)

Mobile:
  - React Native + Expo
  - Mesmo banco de dados (compartilhado)
  - TypeScript

Backend:
  - Node.js + Express
  - TypeScript
  - Prisma ORM (ou raw SQL com Supabase)
  - Bull.js (fila de jobs)
  - Joi (validação de entrada)

Banco de Dados:
  - PostgreSQL via Supabase
  - Row-Level Security (RLS) para multi-tenancy
  - Realtime listeners (opcional, para notificações)

Cache & Queue:
  - Redis (sessions, cache, Bull)

Notificações:
  - Twilio (SMS/WhatsApp)
  - Nodemailer (Email)

Storage:
  - Supabase Storage (documentos, fotos)

Deployment:
  - Vercel (Frontend Next.js)
  - Railway ou Render (Backend Node.js)
  - Supabase Cloud (Banco de dados)
  - Cloud Run ou similar (Jobs/Cron)
```

### Estrutura de Pastas (Monorepo)

```
casas-geriatricas/
├── apps/
│   ├── web/                    # Next.js (web)
│   │   ├── src/
│   │   │   ├── app/           # App Router (pages)
│   │   │   ├── components/    # Componentes React
│   │   │   ├── hooks/         # Custom hooks
│   │   │   ├── lib/           # Utilities, API client
│   │   │   ├── styles/        # CSS global
│   │   │   └── types/         # TypeScript types
│   │   ├── public/
│   │   └── package.json
│   │
│   ├── mobile/                 # React Native/Expo
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   └── types/
│   │   └── package.json
│   │
│   └── api/                    # Express backend
│       ├── src/
│       │   ├── routes/        # API routes
│       │   ├── controllers/   # Lógica de negócio
│       │   ├── middleware/    # Auth, validation, etc
│       │   ├── models/        # Data models (Prisma)
│       │   ├── services/      # Lógica reutilizável
│       │   ├── jobs/          # Bull jobs (notificações, relatórios)
│       │   ├── lib/           # Utilities
│       │   ├── config/        # Variáveis de ambiente
│       │   └── types/         # Shared types
│       ├── prisma/
│       │   └── schema.prisma  # Database schema
│       └── package.json
│
├── packages/                    # Código compartilhado
│   ├── shared-types/           # Types usados em web + mobile + api
│   ├── constants/              # Constantes
│   └── utils/                  # Funções utilitárias
│
├── pnpm-workspace.yaml         # Monorepo config (recomendado pnpm)
└── README.md
```

---

## 🗄️ SCHEMA DO BANCO DE DADOS

### Tabelas Essenciais

```sql
-- MULTI-TENANCY
CREATE TABLE houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(255),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(255),
  owner_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- USUARIOS (FUNCIONARIOS, ADMINS)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'nurse', 'caregiver', 'admin_finance', 'director') NOT NULL,
  phone VARCHAR(20),
  active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RESIDENTES
CREATE TABLE residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  cpf VARCHAR(11) UNIQUE,
  rg VARCHAR(20),
  birth_date DATE,
  gender ENUM('M', 'F', 'O') DEFAULT 'M',
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(255),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relationship VARCHAR(100),
  medical_history TEXT, -- JSON: { allergies: [...], surgeries: [...], conditions: [...] }
  photo_url VARCHAR(500),
  admission_date DATE,
  status ENUM('active', 'inactive', 'discharged') DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DOCUMENTOS (RG, CPF, etc)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  type ENUM('rg', 'cpf', 'income_statement', 'other') NOT NULL,
  file_url VARCHAR(500) NOT NULL, -- Supabase Storage
  expires_at DATE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MEDICAMENTOS (PRESCRIÇÕES)
CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100), -- Ex: "500mg"
  frequency VARCHAR(100), -- Ex: "2x ao dia", "a cada 8h"
  times_per_day INT, -- 1, 2, 3, 4 (calculado a partir de frequency)
  scheduled_times TEXT[], -- ['08:00', '16:00', '00:00']
  start_date DATE NOT NULL,
  end_date DATE,
  prescriber_name VARCHAR(255),
  prescriber_crm VARCHAR(20),
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LOG DE MEDICAMENTOS (RASTREAMENTO)
CREATE TABLE medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  administered_by UUID NOT NULL REFERENCES users(id),
  administered_at TIMESTAMP NOT NULL, -- Exatamente quando foi dado
  status ENUM('administered', 'refused', 'missed', 'delayed') DEFAULT 'administered',
  reason_if_not_given VARCHAR(255), -- Se refused ou missed
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ESCALA DE TRABALHO
CREATE TABLE work_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift ENUM('morning', 'afternoon', 'night', 'full_day') NOT NULL,
  start_time TIME,
  end_time TIME,
  confirmed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VISITANTES
CREATE TABLE visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  visit_date DATE NOT NULL,
  visit_time_in TIME,
  visit_time_out TIME,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FINANCEIRO
CREATE TABLE financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  type ENUM('charge', 'payment', 'refund', 'adjustment') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description VARCHAR(500),
  due_date DATE,
  paid_date DATE,
  payment_method ENUM('cash', 'check', 'bank_transfer', 'credit_card', 'other'),
  invoice_number VARCHAR(50),
  nfe_number VARCHAR(100), -- NF-e number se emitida
  status ENUM('pending', 'paid', 'overdue', 'canceled') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AUDIT LOG (ÚLTIMOS 30 DIAS)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL, -- 'created_resident', 'administered_medication', etc
  entity_type VARCHAR(100), -- 'resident', 'medication', 'user', etc
  entity_id UUID,
  old_values JSONB, -- Valores antigos (se update)
  new_values JSONB, -- Novos valores (se update)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Trigger para deletar logs com > 30 dias
```

### Índices Críticos

```sql
-- Para performance
CREATE INDEX idx_users_house_id ON users(house_id);
CREATE INDEX idx_residents_house_id ON residents(house_id);
CREATE INDEX idx_medications_resident_id ON medications(resident_id);
CREATE INDEX idx_medication_logs_medication_id ON medication_logs(medication_id);
CREATE INDEX idx_medication_logs_resident_id ON medication_logs(resident_id);
CREATE INDEX idx_medication_logs_administered_at ON medication_logs(administered_at DESC);
CREATE INDEX idx_work_schedules_user_id ON work_schedules(user_id);
CREATE INDEX idx_work_schedules_date ON work_schedules(date);
CREATE INDEX idx_financial_records_resident_id ON financial_records(resident_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

### Row-Level Security (RLS)

```sql
-- Cada usuário vê APENAS dados da sua house_id
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;

CREATE POLICY residents_house_isolation ON residents
  FOR ALL
  USING (house_id = (SELECT house_id FROM users WHERE id = auth.uid()))
  WITH CHECK (house_id = (SELECT house_id FROM users WHERE id = auth.uid()));

-- Similar para todas as outras tabelas...
```

---

## 🔐 AUTENTICAÇÃO E PERMISSÕES

### Fluxo de Auth

1. **Login:** Email + Senha → JWT token (via Supabase)
2. **Token:** Armazenado no localStorage (web) ou secure storage (mobile)
3. **Requisições:** Cada requisição envia `Authorization: Bearer <token>`
4. **Backend:** Valida token + extrai user_id + verifica house_id via RLS

### Roles e Permissões

```typescript
// Roles disponíveis
type UserRole = 
  | 'admin'           // Total access
  | 'director'        // Relatórios, financeiro, usuários
  | 'nurse'           // Medicamentos, residentes, histórico médico
  | 'caregiver'       // Ver residentes, registrar medicamentos, visitantes
  | 'admin_finance';  // Financeiro, NF-e, relatórios de fluxo

// Matriz de permissões (exemplo)
const permissions: Record<UserRole, string[]> = {
  admin: ['*'], // All
  director: ['view_reports', 'manage_financial', 'manage_users', 'view_all_data'],
  nurse: ['manage_medications', 'view_residents', 'manage_medical_history'],
  caregiver: ['view_residents', 'register_medication', 'register_visitor'],
  admin_finance: ['manage_financial', 'generate_nfe', 'view_reports']
};

// Middleware de autenticação
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  const { user } = await supabase.auth.getUser(token);
  req.user = user;
  next();
};

// Middleware de permissão
const requirePermission = (requiredPermission: string) => {
  return async (req, res, next) => {
    const userRole = req.user.role; // obtido do DB
    if (!permissions[userRole].includes('*') && 
        !permissions[userRole].includes(requiredPermission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
```

---

## 🎨 DESIGN E UX

### Layout Base

```
┌─────────────────────────────────────────┐
│           HEADER/NAVBAR                 │
│  Logo | Pesquisa | Notificações | User  │
├──────────────┬──────────────────────────┤
│   SIDEBAR    │                          │
│   Menu       │   MAIN CONTENT           │
│   - Home     │                          │
│   - Residentes                          │
│   - Medicamentos                        │
│   - Escala                              │
│   - Financeiro                          │
│   - Relatórios                          │
│   - Visitantes                          │
│   - Settings                            │
│              │                          │
└──────────────┴──────────────────────────┘
```

### Cores e Tema

```css
Primary: #2563EB (Azul - confiança, médico)
Secondary: #10B981 (Verde - saúde, cuidado)
Warning: #F59E0B (Âmbar - alertas)
Danger: #EF4444 (Vermelho - crítico)
Background: #F9FAFB (Cinza claro)
Text: #1F2937 (Cinza escuro)
Border: #E5E7EB (Cinza)

Dark mode: Suportado (Tailwind)
```

### Componentes Principais

- **Navbar:** Logo, pesquisa, sino de notificações, avatar com dropdown
- **Sidebar:** Menu, icon + label, ativo em azul
- **Cards:** Info do residente, medicamento, etc
- **Tables:** Listagem de dados com paginação, sort, filter
- **Modals:** CRUD de residentes, medicamentos, etc
- **Forms:** Validação em tempo real, placeholder útil
- **Toast:** Notificações de sucesso/erro
- **Calendar:** Escala de trabalho em vista de mês
- **Charts:** Dashboard financeiro (Chart.js ou Recharts)

---

## 🚀 FLUXOS DE NEGÓCIO DETALHADOS

### Fluxo 1: Registrar Administração de Medicamento

```
1. Enfermeiro/Cuidador acessa "Próximos Medicamentos"
2. Vê lista de medicamentos agendados para hoje
3. Clica em "Administrado"
4. Sistema abre modal com:
   - Residente
   - Medicamento
   - Dosagem
   - Horário esperado
   - Campo: "Administrado por:" (auto-preenchido com current user)
   - Campo: "Data/Hora" (atual ou pode editar)
   - Dropdown: "Status" (Administered/Refused/Missed/Delayed)
   - Text: "Motivo se não foi dado"
5. Clica "Confirmar"
6. Sistema registra em medication_logs
7. Se status != "Administered", envia notificação para nurse/director
8. Toast de sucesso
```

### Fluxo 2: Gerar NF-e para Residente

```
1. Admin Financeiro acessa "Financeiro" > "Emitir NF-e"
2. Seleciona período (ex: Abril 2026)
3. Sistema agrega todas as cobranças do residente no período
4. Preenche automaticamente:
   - Tomador: Dados do residente
   - Prestador: Dados da house (Quatro Estações ou Cantinho da Vovó)
   - Items: Lista de cobranças (Hospedagem, Medicamentos, etc)
   - Total: Soma
5. Clica "Emitir NF-e"
6. Sistema integra com API de NF-e (Gerar XML, assinar, enviar)
7. Armazena número da NF-e no BD
8. Gera PDF para download/imprimir
```

### Fluxo 3: Criar Escala para o Mês

```
1. Admin acessa "Escala de Trabalho" > "Novo Mês"
2. Seleciona Maio 2026
3. Vê calendário em branco
4. Clica em dia + horário (ex: 01/05, manhã)
5. Abre modal: Seleciona funcionário(s) e turno
6. Clica "Adicionar"
7. Repete para todo mês
8. Clica "Salvar Escala"
9. Sistema envia notificação para cada funcionário (in-app + SMS)
10. Funcionário pode confirmar ou pedir mudança
```

### Fluxo 4: Registrar Visita

```
1. Cuidador acessa "Visitantes"
2. Clica "Registrar Visita"
3. Abre modal:
   - Residente (dropdown/busca)
   - Nome do visitante
   - Relação (filho, neto, amigo, etc)
   - Contato (phone, email - opcional)
   - Data da visita
   - Hora entrada
   - Hora saída (pode deixar em branco se ainda tá visitando)
   - Notas (comportamento do residente, etc)
4. Clica "Salvar"
5. Registrado no BD
```

---

## 💻 ENDPOINTS DA API (Express)

### Auth
```
POST   /api/auth/register         - Registrar novo usuário
POST   /api/auth/login            - Login (email + password)
POST   /api/auth/logout           - Logout
POST   /api/auth/refresh-token    - Renovar JWT
GET    /api/auth/me               - Dados do usuário atual
```

### Residents
```
GET    /api/residents             - Listar todos (com filtros, paginação)
POST   /api/residents             - Criar novo
GET    /api/residents/:id         - Detalhe
PUT    /api/residents/:id         - Atualizar
DELETE /api/residents/:id         - Deletar (soft-delete)
PUT    /api/residents/:id/photo   - Upload de foto
```

### Medications
```
GET    /api/medications/resident/:residentId  - Medicamentos do residente
POST   /api/medications                        - Criar prescrição
PUT    /api/medications/:id                    - Atualizar
DELETE /api/medications/:id                    - Deletar
GET    /api/medications/:id/logs               - Histórico de administração
POST   /api/medications/:id/logs               - Registrar administração
GET    /api/medications/scheduled/today        - Próximos medicamentos hoje
```

### Schedules
```
GET    /api/schedules?month=2026-05  - Escala do mês
POST   /api/schedules                - Criar/atualizar escala
GET    /api/schedules/:userId        - Escala de um funcionário
PUT    /api/schedules/:id/confirm    - Confirmar escala
```

### Financial
```
GET    /api/financial/resident/:residentId  - Histórico financeiro
POST   /api/financial                       - Registrar cobrança/pagamento
PUT    /api/financial/:id                   - Atualizar
GET    /api/financial/nfe/generate          - Gerar NF-e
GET    /api/financial/reports               - Relatório financeiro
```

### Visitors
```
POST   /api/visitors                        - Registrar visita
GET    /api/visitors/resident/:residentId   - Histórico de visitas
```

### Reports
```
GET    /api/reports/medications      - Relatório de medicamentos
GET    /api/reports/residents        - Relatório de residentes
GET    /api/reports/financial        - Relatório financeiro
GET    /api/reports/staff            - Relatório de pessoal
GET    /api/reports/visitors         - Relatório de visitantes
POST   /api/reports/schedule          - Agendar geração automática
```

### Notifications
```
GET    /api/notifications             - Listar notificações do user
PUT    /api/notifications/:id/read    - Marcar como lido
DELETE /api/notifications/:id         - Deletar
```

---

## 🔔 SISTEMA DE NOTIFICAÇÕES

### Tipos de Notificações

| Tipo | Gatilho | Canais |
|------|---------|--------|
| **Medicamento Próximo** | 30 min antes do horário | In-app, SMS, WhatsApp |
| **Medicamento Vencido** | Após 10 min do horário sem ser registrado | In-app, SMS, WhatsApp |
| **Documento Vencendo** | 7 dias antes de vencer | In-app, Email |
| **Documento Vencido** | No dia do vencimento | In-app, Email, SMS |
| **Escala Criada** | Novo mês de escala | In-app, SMS |
| **Falta na Escala** | Funcionário não confirmou | In-app |
| **Pagamento Vencido** | 1 dia após vencimento | Email |
| **Relatório Pronto** | Relatório agendado foi gerado | In-app, Email |

### Implementação com Bull.js

```typescript
// Queue de notificações
const notificationQueue = new Queue('notifications', {
  connection: redis
});

// Job para medicamento próximo
notificationQueue.process('medication-reminder', async (job) => {
  const { medicationId, residentId, time } = job.data;
  // Enviar notificação via Twilio + Email
});

// Cron: A cada 10 minutos, check próximos medicamentos
const cron = require('node-cron');
cron.schedule('*/10 * * * *', async () => {
  const nextMeds = await getMedicationsInNext30Minutes();
  nextMeds.forEach(med => {
    notificationQueue.add('medication-reminder', med);
  });
});
```

---

## 📱 MOBILE (React Native/Expo)

### Estrutura

```typescript
// Navegação
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Screens principais
- LoginScreen
- HomeScreen (Dashboard)
- ResidentsScreen (Lista)
- ResidentDetailScreen
- MedicationsScreen
- MedicationRegisterScreen (Registrar administração)
- ScheduleScreen
- VisitorsScreen
- SettingsScreen

// Dark mode suportado
// Same API endpoints como web
```

### Features

- Autenticação local (biometria, PIN)
- Sync offline-first (quando voltar online)
- Notificações push
- Camera para foto (residente, documento)
- Galeria para upload

---

## 🧪 TESTES

### Cobertura Mínima

- Auth (login, logout, refresh token)
- CRUD de residentes
- Registro de medicamento
- Geração de NF-e
- Permissões por role
- RLS (dados não se misturam entre casas)
- Notificações

### Tech Stack

```
Jest + React Testing Library (Frontend)
Jest + Supertest (Backend)
Cypress ou Playwright (E2E)
```

---

## 🚀 DEPLOYMENT

### Frontend (Vercel)

```bash
# Vercel detecta automaticamente Next.js
# Deploy: git push → Vercel compila e publica
# Environment: .env.local
```

### Backend (Railway)

```bash
# Railway roda node server.js
# Environment: Variables na dashboard do Railway
# Database: Supabase Cloud (conexão via .env)
```

### Banco de Dados (Supabase)

```bash
# Supabase Cloud gerencia PostgreSQL
# Backups automáticos diários
# RLS ativado
```

### CI/CD (GitHub Actions)

```yaml
# Rodar testes antes de merge
# Validar TypeScript
# Lint com ESLint
```

---

## 📝 INSTRUÇÕES FINAIS PARA VOCÊ (Claude Code)

### Como Começar

1. **Clone/Crie o Monorepo:**
   ```bash
   pnpm create turbo@latest casas-geriatricas
   # ou use Nx: npx create-nx-workspace casas-geriatricas
   ```

2. **Setup Inicial:**
   - Criar apps/web (Next.js)
   - Criar apps/api (Express)
   - Criar apps/mobile (React Native/Expo)
   - Criar packages/shared-types
   - Configurar .env.example

3. **Banco de Dados:**
   - Criar conta Supabase
   - Executar migrations (SQL acima)
   - Ativar RLS
   - Configurar Auth

4. **Desenvolvimento Fase por Fase:**
   - Fase 1: Auth + Schema (1-2 semanas)
   - Fase 2: Residentes + Medicamentos (3-4 semanas)
   - Fase 3: Escala + Financeiro (2-3 semanas)
   - Fase 4: Relatórios + Extras (ongoing)

### Boas Práticas (OBRIGATÓRIO)

- ✅ **TypeScript:** Tipagem completa (sem `any`)
- ✅ **Error Handling:** Try-catch + mensagens úteis
- ✅ **Validação:** Zod no frontend, Joi no backend
- ✅ **Segurança:** HTTPS, JWT, RLS, CORS configurado
- ✅ **Performance:** Índices no BD, cache com Redis
- ✅ **Logging:** Winston ou Pino para logs estruturados
- ✅ **Teste:** Mínimo 70% de cobertura
- ✅ **Código:** ESLint + Prettier (consistência)
- ✅ **Commits:** Mensagens claras (feat:, fix:, etc)
- ✅ **Documentação:** README, API docs, comments

### Quando Ficar em Dúvida

1. Priorize **segurança de dados** (LGPD, RLS, backups)
2. Priorize **rastreamento de medicamentos** (vida das pessoas!)
3. Priorize **performance** (usuários esperam <2s)
4. Quando em dúvida, **converse comigo** (envie screenshots, dúvidas)
5. Não tenha pressa, **faça certo** (é projeto real)

### Milestones

- [ ] Semana 1: Auth + Schema + Documentação
- [ ] Semana 2: CRUD de Residentes (web + mobile)
- [ ] Semana 3: Medicamentos (prescrição + administração)
- [ ] Semana 4: Escala + Financeiro básico
- [ ] Semana 5: Relatórios + NF-e
- [ ] Semana 6: Segunda casa + RLS
- [ ] Semana 7-8: Testes + Polishing
- [ ] Semana 9+: Deploy + Features extras

---

## 🎯 RESUMO: O QUE VOCÊ PRECISA FAZER

**Você vai construir um sistema PROFISSIONAL e ROBUSTO para gerenciar:**

✅ 50 residentes (em 2 casas)  
✅ Múltiplos funcionários (escala)  
✅ Centenas de medicamentos (com rastreamento)  
✅ Operações financeiras (faturas, recibos, NF-e)  
✅ Notificações (WhatsApp, SMS, Email)  
✅ Relatórios (automatizados)  
✅ Web + Mobile (responsivo)  
✅ Segurança (LGPD, RLS, backups diários)  

**Isso é uma OBRA DE ARTE em código. Faça com excelência.**

---

**Boa sorte, Developer! 🚀**

*Este prompt foi criado com 🔥 atenção ao detalhe. Use-o como guia definitivo.*
