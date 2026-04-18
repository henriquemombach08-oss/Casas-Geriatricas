# CasaGeri — Sistema de Gestão para Casas Geriátricas

Software completo de gestão para casas geriátricas, integrando dashboard web, aplicativo mobile e API REST para controle de residentes, medicamentos, visitantes, escalas de trabalho e financeiro.

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-Expo_54-61DAFB?style=flat-square&logo=react&logoColor=black)
![Prisma](https://img.shields.io/badge/Prisma-5.13-2D3748?style=flat-square&logo=prisma&logoColor=white)

---

## Sobre o Projeto

O CasaGeri é um sistema de gestão desenvolvido para casas geriátricas, oferecendo controle centralizado de residentes, equipe, medicamentos, visitantes, escalas e finanças. A plataforma é composta por uma API robusta, um dashboard web para gestores e equipe, e um aplicativo mobile para uso em campo.

---

## Funcionalidades

- **Gestão de residentes** — cadastro completo com dados médicos, documentos, status e histórico
- **Controle de medicamentos** — prescrições, posologia, schedules de administração e log de doses
- **Controle de visitantes** — registro de entrada e saída com identificação e vínculo com residentes
- **Escalas de trabalho** — agendamento e gerenciamento de turnos da equipe
- **Gestão de funcionários** — cadastro, roles, perfis e controle de acesso
- **Módulo financeiro** — cobranças, pagamentos e controle de inadimplência
- **Relatórios e exportações** — relatórios de medicamentos, residentes, financeiro e equipe com exportação em PDF e Excel
- **Controle de acesso por papéis (RBAC)** — 7 roles com permissões diferenciadas
- **Autenticação JWT** — access token + refresh token com rotação segura

---

## Arquitetura

```
casas-geriatricas/
├── apps/
│   ├── api/          # Express + TypeScript + Prisma (REST API)
│   ├── web/          # Next.js 14 (dashboard web)
│   └── mobile/       # Expo SDK 54 (React Native — iOS/Android)
└── package.json      # pnpm workspaces
```

### Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| API | Node.js 20, Express, TypeScript, Prisma ORM |
| Banco de dados | PostgreSQL 15 |
| Web | Next.js 14, React 18, Tailwind CSS, React Query |
| Mobile | Expo SDK 54, React Native 0.81, Expo Router |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Filas | Bull + Redis (jobs agendados, notificações) |
| PDF/Excel | PDFKit, xlsx |
| Logs | Pino, Morgan |
| Validação | Zod, Joi |

---

## Pré-requisitos

- **Node.js** 20+
- **pnpm** 9+
- **PostgreSQL** 15+
- **Redis** 7+

---

## Instalação e Configuração

```bash
# Clonar o repositório
git clone <url>
cd casas-geriatricas

# Instalar todas as dependências (todos os apps via workspaces)
pnpm install

# Configurar variáveis de ambiente da API
cp apps/api/.env.example apps/api/.env
# Editar apps/api/.env com suas credenciais
```

---

## Variáveis de Ambiente (API)

Crie o arquivo `apps/api/.env` com as seguintes variáveis:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | Connection string do PostgreSQL | `postgresql://user:pass@localhost:5432/casageri` |
| `JWT_SECRET` | Chave secreta para assinar access tokens | string aleatória segura |
| `JWT_REFRESH_SECRET` | Chave secreta para assinar refresh tokens | string aleatória segura (diferente) |
| `JWT_EXPIRES_IN` | Expiração do access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Expiração do refresh token | `7d` |
| `REDIS_URL` | URL de conexão com o Redis | `redis://localhost:6379` |
| `PORT` | Porta em que a API irá escutar | `3001` |
| `NODE_ENV` | Ambiente de execução | `development` / `production` |

---

## Banco de Dados

```bash
# Rodar as migrations (cria/atualiza o schema no banco)
cd apps/api
pnpm prisma migrate dev

# Seed inicial com dados de exemplo (opcional)
pnpm prisma db seed

# Abrir o Prisma Studio (interface visual do banco)
pnpm prisma studio
```

Ou, a partir da raiz do monorepo:

```bash
pnpm db:migrate
pnpm db:studio
```

---

## Executando em Desenvolvimento

Cada app pode ser iniciado individualmente ou em paralelo:

```bash
# Iniciar todos os apps em paralelo (a partir da raiz)
pnpm dev

# API — porta 3001
cd apps/api && pnpm dev

# Web — porta 3000
cd apps/web && pnpm dev

# Mobile — Expo DevTools
cd apps/mobile && pnpm dev
```

---

## API Endpoints

A documentação interativa completa está disponível via Swagger UI em:

```
http://localhost:3001/api-docs
```

Visão geral dos módulos disponíveis:

| Módulo | Base Path | Descrição |
|--------|-----------|-----------|
| Auth | `/api/auth` | Login, registro, refresh token, logout |
| Residentes | `/api/residents` | CRUD de residentes e documentos |
| Medicamentos | `/api/medications` | Prescrições, schedules e logs de administração |
| Visitantes | `/api/visitors` | Controle de entrada e saída |
| Funcionários | `/api/users` | Gestão de equipe e perfis |
| Escalas | `/api/schedules` | Escalas de trabalho e turnos |
| Financeiro | `/api/financial` | Cobranças e pagamentos |
| Relatórios | `/api/reports` | Dashboards e exportação PDF/Excel |

---

## Papéis de Acesso (RBAC)

O sistema implementa controle de acesso baseado em papéis. Cada usuário possui exatamente um role:

| Role | Descrição |
|------|-----------|
| `admin` | Acesso total ao sistema |
| `director` | Gestão geral da casa geriátrica |
| `nurse` | Controle de medicamentos e saúde dos residentes |
| `caregiver` | Acompanhamento diário dos residentes |
| `admin_finance` | Acesso ao módulo financeiro |
| `cook` | Acesso limitado (escalas e informações básicas) |
| `other` | Perfil customizável para demais funções |

---

## Scripts Disponíveis

Na raiz do monorepo:

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Inicia todos os apps em paralelo |
| `pnpm dev:api` | Inicia somente a API |
| `pnpm dev:web` | Inicia somente o dashboard web |
| `pnpm build` | Build de produção de todos os apps |
| `pnpm lint` | Lint em todos os apps |
| `pnpm typecheck` | Type check em todos os apps |
| `pnpm test` | Roda os testes (Jest) |
| `pnpm db:migrate` | Executa migrations do Prisma |
| `pnpm db:studio` | Abre o Prisma Studio |
| `pnpm format` | Formata o código com Prettier |

---

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).
