FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/order-orchestrater ./services/order-orchestrater

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @food-delivery/shared build
RUN cd services/order-orchestrater && npx prisma generate
RUN pnpm --filter @food-delivery/order-orchestrator build


FROM node:20-alpine AS runtime

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/order-orchestrater/package.json ./services/order-orchestrater/

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/order-orchestrater/dist ./services/order-orchestrater/dist
COPY --from=builder /app/services/order-orchestrater/src/generated ./services/order-orchestrater/src/generated
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/order-orchestrater/node_modules ./services/order-orchestrater/node_modules

COPY --from=builder /app/services/order-orchestrater/prisma ./services/order-orchestrater/prisma

WORKDIR /app/services/order-orchestrater

EXPOSE 3001

CMD ["node", "dist/app.js"]