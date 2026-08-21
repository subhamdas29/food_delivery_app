FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/restaurant-service ./services/restaurant-service

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @food-delivery/shared build
RUN cd services/restaurant-service && npx prisma generate
RUN pnpm --filter @food-delivery/restaurant-service build
RUN cp -r services/restaurant-service/src/generated services/restaurant-service/dist/generated

WORKDIR /app/services/restaurant-service

EXPOSE 3003

CMD ["node", "dist/app.js"]