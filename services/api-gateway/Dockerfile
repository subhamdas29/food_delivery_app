FROM node:20-alpine AS builder

WORKDIR /app


RUN npm install -g pnpm


COPY package.json pnpm-workspace.yaml turbo.json ./
COPY tsconfig.base.json ./


COPY packages/shared ./packages/shared


COPY services/api-gateway ./services/api-gateway


RUN pnpm install --frozen-lockfile

# Build shared first, then the service
RUN pnpm --filter @food-delivery/shared build
RUN pnpm --filter @food-delivery/api-gateway build


FROM node:20-alpine AS runtime

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/api-gateway/package.json ./services/api-gateway/

# Copy built output
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/api-gateway/dist ./services/api-gateway/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/api-gateway/node_modules ./services/api-gateway/node_modules

WORKDIR /app/services/api-gateway

EXPOSE 3000

CMD ["node", "dist/app.js"]