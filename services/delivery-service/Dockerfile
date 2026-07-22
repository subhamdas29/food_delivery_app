FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/delivery-service ./services/delivery-service

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @food-delivery/shared build
RUN pnpm --filter @food-delivery/delivery-service build

# ── Runtime ───────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/delivery-service/package.json ./services/delivery-service/

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/delivery-service/dist ./services/delivery-service/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/delivery-service/node_modules ./services/delivery-service/node_modules
COPY --from=builder /app/services/delivery-service/prisma ./services/delivery-service/prisma
COPY --from=builder /app/services/delivery-service/node_modules/.prisma ./services/delivery-service/node_modules/.prisma

WORKDIR /app/services/delivery-service

EXPOSE 3004

CMD ["node", "dist/app.js"]