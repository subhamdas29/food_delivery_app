FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/order-orchestrater ./services/order-orchestrater

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @food-delivery/shared build
RUN cd services/order-orchestrater && npx prisma generate
RUN pnpm --filter @food-delivery/order-orchestrator build

WORKDIR /app/services/order-orchestrater

EXPOSE 3001

CMD ["node", "dist/app.js"]