# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root monorepo files for pnpm workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/
COPY packages ./packages

# Install dependencies
RUN pnpm install --filter frontend...

# Copy frontend source code
COPY frontend ./frontend

# Build static assets
RUN pnpm --filter frontend build

# Production stage using Nginx
FROM nginx:alpine AS production
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Custom Nginx configuration for SPA client-side routing
RUN echo 'server { \
  listen 80; \
  location / { \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    try_files $uri $uri/ /index.html; \
  } \
  location /api/ { \
    proxy_pass http://api-gateway:3000/; \
    proxy_set_header Host $host; \
    proxy_set_header X-Real-IP $remote_addr; \
  } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
