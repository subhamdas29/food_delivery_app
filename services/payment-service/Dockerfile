FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/payment-service ./services/payment-service

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @food-delivery/shared build
RUN cd services/payment-service && npx prisma generate
RUN pnpm --filter @food-delivery/payment-service build

WORKDIR /app/services/payment-service

EXPOSE 3002

CMD ["node", "dist/app.js"]