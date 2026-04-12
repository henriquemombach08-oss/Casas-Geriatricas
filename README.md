# CasaGeri — Sistema de Gerenciamento de Casas Geriátricas

Monorepo com Next.js 14, Express, React Native/Expo e PostgreSQL/Supabase.

## Estrutura

```
casas-geriatricas/
├── apps/
│   ├── web/       # Next.js 14 (App Router) — dashboard web
│   ├── api/       # Express + Prisma — backend REST
│   └── mobile/    # React Native/Expo — app mobile
├── packages/
│   ├── shared-types/   # Types TypeScript compartilhados
│   ├── constants/      # Constantes (ex: roles, shifts)
│   └── utils/          # Utilitários compartilhados
└── pnpm-workspace.yaml
```

## Pré-requisitos

- Node.js >= 20
- pnpm >= 9 (`npm i -g pnpm`)
- Redis (local ou Upstash)
- Conta Supabase

## Setup rápido

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar variáveis de ambiente
cp apps/api/.env.example apps/api/.env
# Editar apps/api/.env com suas credenciais Supabase, Redis, etc.

# 3. Gerar cliente Prisma e rodar migrations
pnpm db:generate
pnpm db:migrate

# 4. Rodar em desenvolvimento (web + api em paralelo)
pnpm dev
```

## Desenvolvimento individual

```bash
pnpm dev:web     # Next.js na porta 3000
pnpm dev:api     # Express na porta 3001
```

## Banco de dados

```bash
pnpm db:migrate   # Rodar migrations
pnpm db:generate  # Gerar tipos Prisma
pnpm db:studio    # Abrir Prisma Studio
```

## Stack

| Camada | Tech |
|--------|------|
| Frontend | Next.js 14, React 18, Tailwind CSS, React Query, Zod |
| Backend | Node.js, Express, Prisma ORM, Bull.js, Joi |
| Banco | PostgreSQL via Supabase (com RLS) |
| Cache/Fila | Redis + Bull |
| Storage | Supabase Storage |
| Notificações | Twilio (SMS/WhatsApp) + Nodemailer |
| Mobile | React Native + Expo |
| Deploy | Vercel (web), Railway (api), Supabase Cloud (db) |

## Funcionalidades

- Gestão de residentes (CRUD, foto, documentos com alertas de vencimento)
- Controle de medicamentos com rastreamento de administração
- Escala de trabalho (calendário, notificações)
- Gestão financeira (cobranças, recebimentos, NF-e, relatórios)
- Visitantes (registro de entrada/saída)
- Notificações multi-canal (in-app, SMS, WhatsApp, Email)
- Auditoria de ações (últimos 30 dias)
- Multi-tenancy com RLS (2 casas isoladas)
- LGPD compliant
