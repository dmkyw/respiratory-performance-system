# PocketBase Dockerfile for Render deployment
FROM alpine:latest

# Install necessary packages
RUN apk add --no-cache \
    ca-certificates \
    unzip \
    wget \
    curl

# Create app directory
WORKDIR /app

# Download and install PocketBase
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v0.20.0/pocketbase_0.20.0_linux_amd64.zip \
    && unzip pocketbase_0.20.0_linux_amd64.zip \
    && chmod +x pocketbase \
    && rm pocketbase_0.20.0_linux_amd64.zip

# Copy configuration files
COPY pb_migrations ./pb_migrations
COPY pb_hooks ./pb_hooks
COPY pb_public ./pb_public

# Create data directory
RUN mkdir -p pb_data

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Start PocketBase
CMD ["./pocketbase", "serve", "--http=0.0.0.0:8080", "--dir=/app/pb_data"]