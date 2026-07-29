FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/payment-service ./services/payment-service

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @food-delivery/shared build
RUN cd services/payment-service && npx prisma generate
RUN pnpm --filter @food-delivery/payment-service build


FROM node:20-alpine AS runtime

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/payment-service/package.json ./services/payment-service/

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/payment-service/dist ./services/payment-service/dist
COPY --from=builder /app/services/payment-service/src/generated ./services/payment-service/src/generated
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/payment-service/node_modules ./services/payment-service/node_modules
COPY --from=builder /app/services/payment-service/prisma ./services/payment-service/prisma

WORKDIR /app/services/payment-service

EXPOSE 3002

CMD ["node", "dist/app.js"]