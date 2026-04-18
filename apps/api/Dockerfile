FROM node:20-alpine
RUN apk add --no-cache openssl python3 make g++
RUN npm install -g pnpm@9

WORKDIR /app

# Install deps (ignore scripts — prisma needs schema first)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --filter api --ignore-scripts

# Copy source + schema, then generate + build
COPY apps/api ./apps/api
RUN cd apps/api && npx prisma generate --schema=./prisma/schema.prisma
RUN cd apps/api && pnpm build

ENV NODE_ENV=production
WORKDIR /app
EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
