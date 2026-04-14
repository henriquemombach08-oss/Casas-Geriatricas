# CasaGeri — Sistema de Gestão para Casas Geriátricas

Sistema completo de gerenciamento para casas geriátricas, desenvolvido em TypeScript com Next.js, Node.js e PostgreSQL (Supabase).

## Funcionalidades

- **Residentes** — cadastro completo, histórico médico, foto, documentos (CNH/RG/Convênio)
- **Medicamentos** — prescrições, schedule board, rastreamento de administração, adesão em tempo real
- **Escala de Trabalho** — calendário mensal, check-in/check-out, confirmação de escala, detecção de ausências
- **Financeiro** — cobranças, pagamentos, NF-e, fluxo de caixa, inadimplência
- **Relatórios** — dashboards de BI, exportação PDF (pdfkit) e Excel (xlsx)
- **Notificações** — alertas de medicamentos atrasados, lembretes de escala

## Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, Recharts |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Banco de dados | PostgreSQL via Supabase (pooler PgBouncer) |
| Jobs | Bull.js + Redis, node-cron |
| Deploy | Vercel (web) + Vercel Functions (API) + Supabase (DB) |

## Estrutura do Monorepo

```
apps/
  web/          # Next.js 14 — painel administrativo
  api/          # Express API
  mobile/       # React Native / Expo (em desenvolvimento)
packages/
  shared-types/ # Tipos TypeScript compartilhados
```

## Primeiros Passos

### Requisitos

- Node.js 18+
- pnpm 8+
- Conta Supabase (PostgreSQL)
- Redis (para jobs em dev local)

### Instalação

```bash
git clone https://github.com/henriquemombach08-oss/Casas-Geriatricas.git
cd Casas-Geriatricas
pnpm install
```

### Variáveis de Ambiente

```bash
# apps/api/.env
DATABASE_URL=postgresql://postgres.[project-id]:[password]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
JWT_SECRET=<segredo-aleatorio-256-bits>
FRONTEND_URL=http://localhost:3000
PORT=3001
NODE_ENV=development

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Banco de Dados

```bash
cd apps/api
pnpm db:generate   # gera o Prisma client
pnpm db:push       # sincroniza schema com Supabase
pnpm db:seed       # popula dados de exemplo (opcional)
```

### Executar em Desenvolvimento

```bash
# raiz do monorepo
pnpm dev
# Web: http://localhost:3000
# API: http://localhost:3001
```

### Testes

```bash
cd apps/api
pnpm test          # 71 testes unitários (Jest + ts-jest)
```

## Deploy

### Web (Vercel)

1. Conectar repositório no Vercel
2. Root Directory: `apps/web`
3. Variável de ambiente: `NEXT_PUBLIC_API_URL=https://[seu-api].vercel.app/api`

### API (Vercel Functions)

1. Conectar repositório no Vercel (projeto separado)
2. Root Directory: `apps/api`
3. Configurar variáveis: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [Manual do Administrador](docs/ADMIN.md) | Como usar o sistema como administrador |
| [Manual do Usuário](docs/USER.md) | Guia para cuidadores e enfermeiros |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Resolução de problemas comuns |
| [Disaster Recovery](docs/DISASTER_RECOVERY.md) | Plano de recuperação de desastres |

## Segurança

- JWT com refresh token rotation
- bcrypt (12 rounds) para senhas
- Helmet.js — security headers HTTP
- Rate limiting: 200 req/15min global; 10 tentativas/15min no login
- CORS restrito ao domínio do frontend
- Prisma ORM — imune a SQL injection
- CSP, X-Frame-Options, X-Content-Type-Options no Next.js
- Dados de saúde tratados conforme LGPD

## Suporte

Para dúvidas ou problemas, abra uma issue no repositório.
