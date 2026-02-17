FROM node:20-slim AS base

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

# Copy source code
COPY . .

# Create data directory for cache
RUN mkdir -p data

# Build Next.js
RUN bun run build

# Expose port
EXPOSE 3000

# Start the app
CMD ["bun", "start"]
