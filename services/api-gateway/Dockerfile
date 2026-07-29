FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/api-gateway ./services/api-gateway

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @food-delivery/shared build
RUN pnpm --filter @food-delivery/api-gateway build

WORKDIR /app/services/api-gateway

EXPOSE 3000

CMD ["node", "dist/app.js"]