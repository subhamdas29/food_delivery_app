FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/delivery-service ./services/delivery-service

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @food-delivery/shared build
RUN cd services/delivery-service && npx prisma generate
RUN pnpm --filter @food-delivery/delivery-service build

WORKDIR /app/services/delivery-service

EXPOSE 3004

CMD ["node", "dist/app.js"]