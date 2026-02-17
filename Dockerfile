FROM node:20-slim AS base

# Install Python and pip for cinemagoer
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Install bun
RUN npm install -g bun

# Install Playwright system dependencies
RUN npx playwright install-deps chromium

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Install Playwright browsers
RUN bunx playwright install chromium

# Install Python dependencies (cinemagoer/IMDbPY)
RUN pip3 install --no-cache-dir cinemagoer

# Copy source code
COPY . .

# Create data directory for cache
RUN mkdir -p data

# Build Next.js
RUN bun run build

# Copy static files for standalone build
RUN cp -r .next/static .next/standalone/.next/static
RUN cp -r public .next/standalone/public

# Copy Python scripts to standalone
RUN cp -r scripts .next/standalone/scripts

# Set working directory to standalone
WORKDIR /app/.next/standalone

# Expose port
EXPOSE 3000

# Start the standalone server
CMD ["node", "server.js"]
