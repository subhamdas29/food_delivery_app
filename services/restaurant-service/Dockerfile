FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/restaurant-service ./services/restaurant-service

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @food-delivery/shared build
RUN cd services/restaurant-service && npx prisma generate
RUN pnpm --filter @food-delivery/restaurant-service build


FROM node:20-alpine AS runtime

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/restaurant-service/package.json ./services/restaurant-service/

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/restaurant-service/dist ./services/restaurant-service/dist
COPY --from=builder /app/services/restaurant-service/src/generated ./services/restaurant-service/src/generated
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/restaurant-service/node_modules ./services/restaurant-service/node_modules
COPY --from=builder /app/services/restaurant-service/prisma ./services/restaurant-service/prisma

WORKDIR /app/services/restaurant-service

EXPOSE 3003

CMD ["node", "dist/app.js"]