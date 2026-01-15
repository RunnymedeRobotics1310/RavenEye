# Build stage - compile the React application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build argument for API host URL (can be overridden at build time)
ARG VITE_API_HOST=https://ravenbrain.team1310.ca
ENV VITE_API_HOST=${VITE_API_HOST}

# Build the application
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built static files from builder stage
COPY --from=builder /app/build/client /usr/share/nginx/html

# Create directory for SSL certificates (mounted at runtime)
RUN mkdir -p /etc/nginx/certs

# Expose HTTPS port
EXPOSE 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider https://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
