# Production stage - serve pre-built static files with nginx
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy pre-built static files (built in CI, not in Docker)
COPY build/client /usr/share/nginx/html

# Create directory for SSL certificates (mounted at runtime)
RUN mkdir -p /etc/nginx/certs

# Expose HTTPS port
EXPOSE 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider https://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
