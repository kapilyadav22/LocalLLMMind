# Stage 1: Build production bundle
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve with zero-vulnerability lightweight Nginx
FROM nginx:alpine-slim

# Remove default static files
RUN rm -rf /usr/share/nginx/html/*

# Copy build artifacts from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx template (processed automatically by nginx:alpine envsubst entrypoint)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Default runtime configuration
ENV PORT=80
ENV OLLAMA_URL=http://host.docker.internal:11434

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:${PORT}/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
