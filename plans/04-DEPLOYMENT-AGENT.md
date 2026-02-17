# Deployment Agent Plan

## Role

You own deployment configuration, Render.com setup, and making sure the app
runs correctly in production. You own:
- `Dockerfile`
- `render.yaml` (Render Blueprint)
- `next.config.ts`
- `.dockerignore`

## Wait Condition

**Do not start deployment until both backend and frontend have working code
locally.** You will be notified by the lead. While waiting, you can:
- Read the architecture plan (`plans/00-ARCHITECTURE.md`)
- Familiarize yourself with Render.com docs
- Plan the Dockerfile

---

## Phase 1: Dockerfile

### 1.1 Create `Dockerfile`

```dockerfile
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
```

### 1.2 Create `.dockerignore`

```
node_modules
.next
.git
plans/
data/cache.json
*.md
```

### 1.3 Test Docker build locally

```bash
docker build -t imdb-actor-ratings .
docker run -p 3000:3000 imdb-actor-ratings
# Test: open http://localhost:3000
```

---

## Phase 2: Render Configuration

### 2.1 Create `render.yaml` (Blueprint)

```yaml
services:
  - type: web
    runtime: docker
    name: imdb-actor-ratings
    repo: https://github.com/YOUR_USERNAME/imdb-actor-ratings
    plan: free
    dockerfilePath: ./Dockerfile
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: "3000"
    healthCheckPath: /
```

**Ask human**: What is their GitHub username/org for the repo URL?

### 2.2 `next.config.ts`

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',  // Required for Docker deployment
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.media-amazon.com',
      },
    ],
  },
};

export default nextConfig;
```

Key: `output: 'standalone'` produces a self-contained build that doesn't
need `node_modules` at runtime (smaller Docker image).

---

## Phase 3: Deploy to Render

### 3.1 Push to GitHub

```bash
# Ask human if repo already exists, if not:
gh repo create imdb-actor-ratings --public --source=. --push
```

**Ask human** before creating/pushing the repo.

### 3.2 Deploy on Render

Two options:

**Option A: Via render.yaml (Blueprint)**
1. Go to https://dashboard.render.com/
2. Click "New" → "Blueprint"
3. Connect GitHub repo
4. Render reads `render.yaml` and creates the service

**Option B: Via CLI / Dashboard**
1. Go to https://dashboard.render.com/
2. Click "New" → "Web Service"
3. Connect GitHub repo
4. Settings:
   - Environment: Docker
   - Plan: Free
   - Region: Oregon
5. Click "Create Web Service"

**Ask human** to do the Render dashboard steps (requires auth).

### 3.3 Wait for first deploy

Render builds the Docker image and deploys. First build takes 5-10 minutes
due to Playwright + Chromium install.

Monitor build logs for:
- `bun install` success
- `playwright install chromium` success
- `bun run build` success
- Container starts on port 3000

---

## Phase 4: Verification

### 4.1 Production smoke test

Once deployed, Render provides a URL like `https://imdb-actor-ratings.onrender.com`

- [ ] Homepage loads
- [ ] Search for "Leonardo DiCaprio" returns results
- [ ] Selecting an actor shows the ratings chart
- [ ] No console errors
- [ ] Mobile layout works
- [ ] Check Render dashboard for:
  - Container memory usage (should stay under 512MB)
  - Response times
  - Error logs

### 4.2 Cold Start Test

The free tier sleeps after 15 min. Test cold start:
1. Wait 20 minutes
2. Visit the URL
3. Should load within 30-60 seconds

### 4.3 Common Issues

**Build fails - Playwright install**:
- Ensure `npx playwright install-deps chromium` runs before `playwright install chromium`
- Use `node:20-slim` base image (not Alpine — Playwright needs glibc)

**Container OOM**:
- Render free tier gives 512MB RAM
- Playwright + Chromium uses ~300-400MB
- If OOMing, add `--single-process` to Chromium args

**Port issues**:
- Render expects the app to listen on `PORT` env var (defaults to 10000)
- Next.js defaults to 3000
- Set `PORT=3000` in render.yaml or use `next start -p $PORT`

**Slow responses**:
- First scrape for an actor: 30-60s (Playwright + IMDb)
- Subsequent requests for same actor: <100ms (JSON cache hit)
- This is expected behavior

---

## Phase 5: Optional Enhancements

### Custom Domain
On Render dashboard: Settings → Custom Domains → Add domain.
Free SSL included.

### Uptime Monitoring
Use a free service like UptimeRobot to ping the app every 14 minutes,
preventing the free tier from sleeping.

### GitHub Actions (optional)
If Render's auto-deploy isn't enough, add a GitHub Action:
```yaml
# .github/workflows/deploy.yml
name: Deploy to Render
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Trigger Render Deploy
        run: curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK }}"
```

---

## File Ownership Rules

- **You own**: `Dockerfile`, `.dockerignore`, `render.yaml`, `next.config.ts`
- **You do NOT touch**: `src/server/**`, `src/scraper/**`, `src/components/**`
- **You can modify**: `package.json` (only scripts like `start`, `build`)
- **You read**: everything (to verify build works)

## When to Ask for Human Input

- GitHub repo creation/push
- Render dashboard login and service creation
- Custom domain configuration
- If Docker build fails and you can't figure out why
- Before any change that affects the build (Dockerfile, next.config.ts)
- If container keeps OOMing or crashing
