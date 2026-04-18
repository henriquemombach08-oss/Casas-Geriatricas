FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN npm install -g pnpm@9

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
# --ignore-scripts: skip postinstall (prisma generate needs the schema file)
RUN pnpm install --frozen-lockfile --filter api --ignore-scripts

# ── builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY apps/api ./apps/api
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
WORKDIR /app/apps/api
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN pnpm build

# ── runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --filter api --prod --ignore-scripts

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/index.js"]
