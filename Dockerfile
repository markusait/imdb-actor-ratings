FROM node:20-slim AS base

# Install Python runtime for optional scripts
RUN apt-get update && apt-get install -y \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Install bun
RUN npm install -g bun

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Create data directory for cache
RUN mkdir -p data

# Build Next.js
RUN bun run build

# Copy static files for standalone build
RUN cp -r .next/static .next/standalone/.next/static
RUN cp -r public .next/standalone/public

# Set working directory to standalone
WORKDIR /app/.next/standalone

# Expose port
EXPOSE 3000

# Bind to all network interfaces (required for Docker/Render)
ENV HOSTNAME=0.0.0.0

# Start the standalone server
CMD ["node", "server.js"]
